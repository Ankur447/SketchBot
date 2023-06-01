
##########################################################################################
##########################################################################################
# DexArm Drawing Application
# SVG / SVG Path to Gcode
# Author : Varun Gujjar / Ronin Labs
##########################################################################################
##########################################################################################

# from env import *
from flask import Flask, request
from flask_cors import CORS
from threading import Thread
import requests
from lib import SVG_GCode
from lib.pydexarm import Dexarm
import time

from rq import Queue
from rq.job import Job
from worker import conn
q = Queue(connection=conn)


app = Flask(__name__)
CORS(app)
# cors = CORS(app, resource={
#     r"/*":{
#         "origins":"*"
#     }
# })

##########################################################################################
# API Server Configuration
##########################################################################################

host = '0.0.0.0'
port = 8251
debug = False

##########################################################################################
# Dex Arm Configuration
##########################################################################################

arm = None
serial_port = "/dev/tty.usbmodem305A366030311"
svg_gcode = SVG_GCode(
    precision=10,
    z_feedrate=3000,
    x_offset=-115,
    y_offset=230,
    z_surface_touch=0,
    z_up_offset=5,
    bed_size_x=230,
    bed_size_y=150,
    longest_edge=230,
    canvas_width=1024,
    canvas_height=668,
    verbose=True,
    fit_canvas=False)


##########################################################################################
##########################################################################################

def connect_arm():
    global arm, port
    try:
        arm = Dexarm(port=serial_port)
        x, y, z, e, a, b, c = arm.get_current_position()
        message = "DexArm connected x: {}, y: {}, z: {}, e: {}\na: {}, b: {}, c: {}".format(
            x, y, z, e, a, b, c)
        print(message)
        return message
    except:
        return


def disconnect_arm():
    global arm, port
    if arm is not None:
        if arm.ser.is_open:
            arm.go_home()
        arm.close()
        arm = None
        return "Disconnected"
    else:
        return "No DexArm connected."


def plot_to_draw(data):
    global arm, port
    time.sleep(0.2)
    connect_arm()
    for line in data:
        arm._send_cmd(f'{line}\r')
    disconnect_arm()
    return True


def plot_gcode(response):
    try:
        data = svg_gcode.path_to_gcode(
            paths=response, plot_image=False, plot_file=True, gcode_path='output.gcode')
        plot_to_draw(data)
    except:
        print("Something went wrong.")
        return


##########################################################################################
# API Routes
##########################################################################################


@app.route('/')
def index():
    return "Server is running."


@app.route('/move', methods=['POST'])
def move():
    response = request.get_json()
    global arm
    connect_arm()
    if arm is not None:
        arm.move_to(x=response['x'], y=response['y'], z=response['z'])
        x, y, z, e, a, b, c = arm.get_current_position()
        position = {'x': x, 'y': y, 'z': z, 'e': e}
        return position
    else:
        return 'No DexArm connected.'


@app.route('/command/<string:command>', methods=['POST'])
def command(command):
    global arm
    connect_arm()
    if arm is not None:
        match command:
            case "home":
                arm.go_home()
            case "reset":
                arm._send_cmd(f'G92.1\r')
            case "stop":
                arm._send_cmd(f'G4\r')
            case "setworkheight":
                arm._send_cmd(f'G92 X0 Y300 Z0 E0\r')
        disconnect_arm()
        return '200 OK HTTPS.'
    else:
        return 'No DexArm connected.'


@app.route('/draw', methods=['POST'])
def draw():
    response = request.get_json()
    from flaskapp import plot_gcode
    if len(response[0]['paths']) > 1:
        job = q.enqueue(plot_gcode, response, result_ttl=2)
        print(f'Started job with ID {job.get_id()}')
    return '200 OK HTTPS.'


if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True, threaded=True)
