##########################################################################################
##########################################################################################
# DexArm Library v 1.0
# SVG / SVG Path to Gcode
# Author : Varun Gujjar / Ronin Labs
##########################################################################################
##########################################################################################

import xml.etree.ElementTree as et
import matplotlib.pyplot as plt
import matplotlib
import numpy as np
import sys
import serial
from copy import copy
from .svg_interpreter import svg_to_coordinate_chomper, repart, svg_to_segment_blocks, path_to_cordinate_chomper, path_to_segment_blocks
from .raycaster import cast_rays
from .pydexarm import Dexarm


##########################################################################################
# Global Variables
##########################################################################################

port = "COM3"
mac_port = "/dev/tty.usbmodem305A366030311"


##########################################################################################
# Helper Functions
##########################################################################################

def get_optimal_scaler(bed_size_x: int, bed_size_y: int, im_length_x: int, im_length_y: int, longest_edge: float):
    X = bed_size_x
    Y = bed_size_y
    a = im_length_x
    b = im_length_y
    # if the aspect ratio of the image and the print bed are similar...
    if ((X/Y)-1)*((a/b)-1) >= 0:
        S = np.linspace(0, 1, 10000)
        # obtained from the derivative of f(s) = ((X - a*s)^2 + (Y - b*s)^2) where s is the scaler
        dfds = np.array([-2*a*(X-s*a) - 2*b*(Y-s*b) for s in S])
        condition = np.array([(Y - s*b) >= 0 and (X - s*a) >= 0 for s in S])
        scaler_idx = np.argmin(np.abs(dfds)[condition])
        scaler = S[scaler_idx]
    else:
        scale_x = longest_edge/im_length_x
        scale_y = longest_edge/im_length_y
        scaler = min(scale_x, scale_y)
    return scaler


def get_pass_list(z_surface: float, z_bottom: float, passes: int) -> list:
    return np.linspace(z_surface, z_bottom, passes).tolist()


def get_optimal_ordering(blockset):
    remaining_blocks = copy(blockset)
    i = 0

    current_block = remaining_blocks.pop()
    yield current_block[-1]

    while len(remaining_blocks) > 0:
        # find nearest block
        if len(remaining_blocks) == 0:
            return
        end = current_block[-1][-1][1]

        best = None
        best_dist = None
        best_idx = None

        for j, rblock in enumerate(remaining_blocks):

            (xstart, ystart) = rblock[-1][0][0]

            dist = np.sqrt(np.power(xstart-end[0], 2) +
                           np.power(ystart-end[1], 2))
            # print(dist)
            if best is None or dist < best_dist:
                best = rblock
                best_dist = dist
                best_idx = j

        print('next best block is ', best_idx, best_dist)
        current_block = best

        yield best[-1]
        remaining_blocks.pop(best_idx)


##########################################################################################
##########################################################################################
# SVG to Gcode Class
##########################################################################################
##########################################################################################

class SVG_GCode:

    def __init__(
        self,
        precision=10,  # precision of curves
        z_feedrate=2000,
        x_offset=50,
        y_offset=50,
        z_surface_touch=0,  # position when touching paper surface
        z_up_offset=10,  # position when picked up
        create_outline=True,
        longest_edge=None,  # Rescale longest edge to this value
        bed_size_x=250,  # mm on paper
        bed_size_y=200,  # mm on paper
        canvas_width=1024,  # pixels
        canvas_height=668,  # pixels
        verbose=False,
        fit_canvas=False,
        debug=False
    ):
        self.precision = precision
        self.z_feedrate = z_feedrate
        self.x_offset = x_offset
        self.y_offset = y_offset
        self.z_surface_touch = z_surface_touch
        self.z_up_offset = z_up_offset
        self.create_outline = create_outline
        self.longest_edge = longest_edge
        self.bed_size_x = bed_size_x
        self.bed_size_y = bed_size_y
        self.canvas_width = canvas_width
        self.canvas_height = canvas_height
        self.verbose = verbose
        self.fit_canvas = fit_canvas
        self.debug = debug

    def svg_to_paths(self, svg_path):
        tree = et.parse(svg_path)
        ns = {'sn': 'http://www.w3.org/2000/svg'}
        root = tree.getroot()
        print(str(len(root.findall('.//sn:path', ns)))+"# Paths found in SVG")
        paths = root.findall('.//sn:path', ns)
        return paths

    def svg_to_coordinates(self, paths):
        max_x = None
        min_x = None
        max_y = None
        min_y = None

        for i, path in enumerate(paths):
            d = path.attrib['d'].replace(',', ' ')
            parts = d.split()

            coordinates = []
            for t in svg_to_coordinate_chomper(inp=repart(parts), PRECISION=self.precision, verbose=self.verbose):
                (x, y), c = t
                coordinates.append([x, y])

            coordinates = np.array(coordinates)
            max_x, min_x, max_y, min_y = self.fit_to_canvas_coordinates(
                coordinates, max_x, min_x, max_y, min_y)

        scaler = None
        if self.longest_edge is not None:
            scaler = get_optimal_scaler(
                self.bed_size_x, self.bed_size_y, max_x - min_x, max_y - min_y, self.longest_edge)

        return max_x, min_x, max_y, min_y, scaler

    def path_to_coordinates(self, paths):
        max_x = None
        min_x = None
        max_y = None
        min_y = None

        for i, path in enumerate(paths):
            coordinates = []
            for t in path_to_cordinate_chomper(path['paths'], PRECISION=self.precision, verbose=self.verbose):
                (x, y) = t
                coordinates.append([x, y])

            coordinates = np.array(coordinates)
            max_x, min_x, max_y, min_y = self.fit_to_canvas_coordinates(
                coordinates, max_x, min_x, max_y, min_y)

        scaler = None
        if self.longest_edge is not None:
            scaler = get_optimal_scaler(
                self.bed_size_x, self.bed_size_y, max_x - min_x, max_y - min_y, self.longest_edge)

        return max_x, min_x, max_y, min_y, scaler

    def fit_to_canvas_coordinates(self, coordinates, max_x, min_x, max_y, min_y):
        if self.fit_canvas:
            bot = np.nanmin(coordinates[:, 0])
            if min_x is None or bot < min_x:
                min_x = bot

            top = np.nanmax(coordinates[:, 0])
            if max_x is None or top > max_x:
                max_x = top

            bot = np.nanmin(coordinates[:, 1])
            if min_y is None or bot < min_y:
                min_y = bot

            top = np.nanmax(coordinates[:, 1])
            if max_y is None or top > max_y:
                max_y = top
        else:
            max_x = self.canvas_width
            min_x = 0
            max_y = self.canvas_height
            min_y = 0

        return max_x, min_x, max_y, min_y

    def calculate_coordinates(self, x1, x2, y1, y2, max_x, min_x, max_y, min_y, scaler):
        x1 -= min_x
        x2 -= min_x
        y1 -= min_y
        y2 -= min_y
        # Convert video coordinates to xy coordinates (flip y)
        y1 = (max_y-min_y)-(y1)
        y2 = (max_y-min_y)-(y2)
        # Scale
        x1 *= scaler
        x2 *= scaler
        y1 *= scaler
        y2 *= scaler
        return x1, x2, y1, y2


##########################################################################################
# Plot Gcode Commands to Image File
##########################################################################################


    def plot_to_image(self, gcode_path):
        plt.xlim(-10, self.bed_size_x+10)
        plt.ylim(-10, self.bed_size_y+10)
        plt.axvline(0, c='r', ls=':')
        plt.axvline(self.bed_size_x, c='r', ls=':')
        plt.axvline(self.bed_size_x-self.x_offset, c='r', ls=':')
        plt.axhline(0, c='r', ls=':')
        plt.axhline(self.bed_size_y, c='r', ls=':')
        plt.axhline(self.bed_size_y-self.y_offset, c='r', ls=':')
        plt.savefig(f'{gcode_path.replace(".gcode","")}.png', dpi=300)


##########################################################################################
# Plot Gcode Commands to GCode Output File
##########################################################################################

    def plot_to_file(self, data, gcode_path):
        print(f"Writing to {gcode_path}")
        o = open(gcode_path, 'w')
        for line in data:
            o.write(f'{line}\n')


##########################################################################################
# Send Gcode Commands to DexArm
##########################################################################################

    # G92.1  (Reset Cordinate Command)
    # G92 X0 Y300 Z0 E0 (Set current position as Work Height)

    def plot_to_draw(self, data):
        arm = Dexarm(port=mac_port)
        x, y, z, e, a, b, c = arm.get_current_position()
        message = "x: {}, y: {}, z: {}, e: {}\na: {}, b: {}, c: {}".format(
            x, y, z, e, a, b, c)
        print(f'--> Robot Connected on {port} with {message}')
        for line in data:
            calibrated_line = line.replace("Z0", f"Z{self.z_surface_touch}")
            arm._send_cmd(f'{calibrated_line}\r')
        arm.close()


##########################################################################################
# SVG to Gcode Conversion
##########################################################################################


    def svg_to_gcode(self,
                     svg_path=None,
                     plot_image=False,
                     plot_file=False,
                     plot_arm=False,
                     gcode_path=None):
        paths = self.svg_to_paths(svg_path)

        max_x = None
        min_x = None
        max_y = None
        min_y = None

        max_x, min_x, max_y, min_y, scaler = self.svg_to_coordinates(paths)
        segment_blocks = list(svg_to_segment_blocks(svg_path))

        prev = None
        blockset = []
        data = []

        print(f'Plotting Start')
        data.append(f'M2000')
        data.append(f'M888 P0')
        data.append(f'G0 Z5')
        data.append(f'G0 F{self.z_feedrate}')
        data.append(f'G1 F{self.z_feedrate}')

        for block in segment_blocks:
            blockset.append([block[0][0], block[-1][1], block])

        for block in get_optimal_ordering(blockset):
            for ii, ((x1, y1), (x2, y2)) in enumerate(block):

                if self.longest_edge is not None:
                    x1, x2, y1, y2 = self.calculate_coordinates(
                        x1, x2, y1, y2, max_x, min_x, max_y, min_y, scaler)

                # if x1>self.bed_size_x or y1>self.bed_size_y or x2>self.bed_size_x or y2>self.bed_size_y:
                #     raise ValueError(f'Coordinates generated which fall outside of supplied printer bed size, adjust printer bed size or add "-longest_edge {min(self.bed_size_x,self.bed_size_y)}" to the command to scale the coordinates')

                if prev is None or prev != (x1, y1):
                    print(
                        f'Travelling to X{self.x_offset+x1:.2f} Y{self.y_offset+y1:.2f}')
                    data.append(f'G0 Z5')
                    data.append(
                        f'G0 X{self.x_offset+x1:.2f} Y{self.y_offset+y1:.2f}')
                    data.append(f'G1 Z0')

                print(
                    f'Plotting X{self.x_offset+x1:.2f} Y{self.y_offset+y1:.2f}')
                print(
                    f'Plotting X{self.x_offset+x2:.2f} Y{self.y_offset+y2:.2f}')
                data.append(
                    f'G1 X{self.x_offset+x1:.2f} Y{self.y_offset+y1:.2f}')
                data.append(
                    f'G1 X{self.x_offset+x2:.2f} Y{self.y_offset+y2:.2f}')
                plt.plot([x1, x2], [y1, y2], c='r')
                prev = (x2, y2)

        print(f'Plotting End')
        data.append(f'G0 Z5')
        # data.append(f'G0 X0.00 Y300.00')

        if plot_image:
            self.plot_to_image(gcode_path)

        if plot_file:
            self.plot_to_file(data, gcode_path)

        if plot_arm:
            self.plot_to_draw(data)


##########################################################################################
# Paths to Gcode Conversion
##########################################################################################


    def path_to_gcode(self,
                      paths=[],
                      plot_image=False,
                      plot_file=False,
                      plot_arm=False,
                      gcode_path=None):

        max_x, min_x, max_y, min_y, scaler = self.path_to_coordinates(paths)
        segment_blocks = list(path_to_segment_blocks(paths))

        prev = None
        blockset = []
        data = []

        print(f'Plotting Start')
        data.append(f'M2000')
        data.append(f'M888 P0')
        data.append(f'G0 Z{self.z_up_offset}')
        data.append(f'G0 F{self.z_feedrate}')
        data.append(f'G1 F{self.z_feedrate}')

        for block in segment_blocks:
            blockset.append([block[0][0], block[-1][1], block])

        for block in get_optimal_ordering(blockset):
            for ii, ((x1, y1), (x2, y2)) in enumerate(block):

                if self.longest_edge is not None:
                    x1, x2, y1, y2 = self.calculate_coordinates(
                        x1, x2, y1, y2, max_x, min_x, max_y, min_y, scaler)

                # if x1>self.bed_size_x or y1>self.bed_size_y or x2>self.bed_size_x or y2>self.bed_size_y:
                #     raise ValueError(f'Coordinates generated which fall outside of supplied printer bed size, adjust printer bed size or add "-longest_edge {min(self.bed_size_x,self.bed_size_y)}" to the command to scale the coordinates')

                if prev is None or prev != (x1, y1):
                    if self.debug:
                        print(
                            f'Travelling to X{self.x_offset+x1:.2f} Y{self.y_offset+y1:.2f}')
                    data.append(f'G0 Z{self.z_up_offset}')
                    data.append(
                        f'G0 X{self.x_offset+x1:.2f} Y{self.y_offset+y1:.2f}')
                    data.append(f'G1 Z0')

                if self.debug:
                    print(
                        f'Plotting X{self.x_offset+x1:.2f} Y{self.y_offset+y1:.2f}')
                    print(
                        f'Plotting X{self.x_offset+x2:.2f} Y{self.y_offset+y2:.2f}')
                data.append(
                    f'G1 X{self.x_offset+x1:.2f} Y{self.y_offset+y1:.2f}')
                data.append(
                    f'G1 X{self.x_offset+x2:.2f} Y{self.y_offset+y2:.2f}')
                # plt.plot([x1,x2],[y1,y2],c='r')
                prev = (x2, y2)

        print(f'Plotting End')
        data.append(f'G0 Z{self.z_up_offset}')
        # data.append(f'G1 X{self.x_offset+x2:.2f} Y{self.y_offset+y2:.2f}')

        if plot_image:
            self.plot_to_image(gcode_path)

        if plot_file:
            self.plot_to_file(data, gcode_path)

        if plot_arm:
            self.plot_to_draw(data)

        return data
