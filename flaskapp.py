

# from env import *
from flask import Flask, request
from flask_cors import CORS
from threading import Thread
import requests
from lib import SVG_GCode
from lib.pydexarm import Dexarm

 
app = Flask(__name__)  
CORS(app)
# cors = CORS(app, resource={
#     r"/*":{
#         "origins":"*"
#     }
# })

##########################################################################################
###### API Server Configuration
##########################################################################################

host = '0.0.0.0'
port=8251
debug=False

##########################################################################################
###### Dex Arm Configuration
##########################################################################################

arm = None
serial_port = "/dev/tty.usbmodem305A366030311"
svg_gcode = SVG_GCode(
                precision=10,
                z_feedrate=3000, 
                x_offset=-115, 
                y_offset=230, 
                z_surface_touch = 0, 
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
        message = "DexArm connected x: {}, y: {}, z: {}, e: {}\na: {}, b: {}, c: {}".format(x, y, z, e, a, b, c)
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
    connect_arm()
    for line in data:
        arm._send_cmd(f'{line}\r')
    disconnect_arm()




##########################################################################################
###### API Routes
##########################################################################################

@app.route('/')
def index():
    return "Server is running."


@app.route('/move', methods=['POST'])
def move():
    response = request.get_json()
    #x y z e


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
    print(response)
    global arm
    connect_arm()
    if arm is not None:
        data = svg_gcode.path_to_gcode(paths=response, plot_image=False, plot_file=True, gcode_path='output.gcode')
        plot_to_draw(data)
        return '200 OK HTTPS.'
    else:
        return 'No DexArm connected.'        
    

if __name__ == "__main__":
   app.run(host='0.0.0.0',port=5000,debug=True,threaded=True)



