''' /*
 * Copyright 2010-2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License").
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *
 *  http://aws.amazon.com/apache2.0
 *
 * or in the "license" file accompanying this file. This file is distributed
 * on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */
 '''
from AWSIoTPythonSDK.MQTTLib import AWSIoTMQTTClient
from AWSIoTPythonSDK.MQTTLib import AWSIoTMQTTShadowClient
import logging
import time
import argparse
import json
import sys
import subprocess
import os
import socket
import RPi.GPIO as GPIO

def setup_GPIO():
    GPIO.setmode(GPIO.BCM)
    GPIO.setwarnings(False)

# get the hostname
hostname = os.uname()[1]

# Set the clientId to hostname
clientId = "controlmypi"

# Set the code version
aws_iot_code_version = "1.3"

# Custom MQTT message callback
def sub_callback(client, userdata, message):

	# The topic contains command and pin so we need to split out
	split_topic = message.topic.split('/')
	command = split_topic[1]
	pin = split_topic[2]

    # msg structure dependent on command so need to set accordingly
    # as payload coming in differently for different topics
	if command != "batchsetgpiolevelsdirections":
		# Convert the payload to all lowercase
		msg = message.payload.lower()
	else:
		msg = json.loads(message.payload)

	if command == "setgpiolevel":
		print("Setting pin " + pin + " level to " + msg)
		if msg == "high":
			GPIO.output(int(pin), GPIO.HIGH)
		elif msg == "low":
			GPIO.output(int(pin), GPIO.LOW)
		else:
			print("Error setting level...\n")
	elif command == "setgpiodirection":
		print("Setting pin " + pin + " direction to " + msg)
		if msg == "output":
			GPIO.setup(int(pin), GPIO.OUT)
		elif msg == "input":
			GPIO.setup(int(pin), GPIO.IN)
		else:
			print("Error setting direction...\n")
	elif command == "readgpiolevel":
		print("Reading pin " + pin + " level")
		level = GPIO.input(int(pin))

		# MQTT message needs to follow thing shadow format
		payload = json.dumps({
			"state":{
				"reported":{
					pin:level
					}
				}
		})

		myAWSIoTMQTTClient.publish("$aws/things/ControlMyPi/shadow/update", payload, 0)
	elif command == "readgpiodirection":
		print("Reading pin " + pin + " direction")
	elif command == "batchsetgpiolevelsdirections":
		print("Setting previously configured pin levels and directions")
		for pin in msg:
			dir = msg[pin]["direction"].lower()
			if dir == "output":
				# Set the direction of pin to output
				GPIO.setup(int(pin), GPIO.OUT)
				# Check if level is found before trying to set
				if "level" in msg[pin]:
					print("level found")
					lvl = msg[pin]["level"].lower()
					if lvl == "high":
						GPIO.output(int(pin), GPIO.HIGH)
					elif lvl == "low":
						GPIO.output(int(pin), GPIO.LOW)
					else:
						print("Error in setting level...\n")
			elif dir == "input":
				GPIO.setup(int(pin), GPIO.IN)
			else:
				print("Error in setting direction...\n")
# Custom MQTT Puback callback
def customPubackCallback(mid):
    print("Received PUBACK packet id: ")
    print(mid)
    print("++++++++++++++\n\n")

# Read in command-line parameters
parser = argparse.ArgumentParser()
parser.add_argument("-e", "--endpoint", action="store", required=True, dest="host", help="Your AWS IoT custom endpoint")
parser.add_argument("-r", "--rootCA", action="store", required=True, dest="rootCAPath", help="Root CA file path")
parser.add_argument("-c", "--cert", action="store", dest="certificatePath", help="Certificate file path")
parser.add_argument("-k", "--key", action="store", dest="privateKeyPath", help="Private key file path")
parser.add_argument("-p", "--port", action="store", dest="port", type=int, help="Port number override")
parser.add_argument("-w", "--websocket", action="store_true", dest="useWebsocket", default=False,
                    help="Use MQTT over WebSocket")
parser.add_argument("-pt", "--publish_topic", action="store", dest="publish_topic", default="controlmypi", help="Publish topic")
parser.add_argument("-st", "--subscribe_topic", action="store", dest="subscribe_topic", default="controlmypi/+/+", help="Subscribe Topic")
parser.add_argument("-as", "--syncType", action="store", dest="syncType", default="async", help="sync or async")

args = parser.parse_args()
host = args.host
rootCAPath = args.rootCAPath
certificatePath = args.certificatePath
privateKeyPath = args.privateKeyPath
port = args.port
useWebsocket = args.useWebsocket

# Set the topics
publish_topic = args.publish_topic

subscribe_topic = args.subscribe_topic

if args.useWebsocket and args.certificatePath and args.privateKeyPath:
    parser.error("X.509 cert authentication and WebSocket are mutual exclusive. Please pick one.")
    exit(2)

if not args.useWebsocket and (not args.certificatePath or not args.privateKeyPath):
    parser.error("Missing credentials for authentication.")
    exit(2)

# Port defaults
if args.useWebsocket and not args.port:  # When no port override for WebSocket, default to 443
    port = 443
if not args.useWebsocket and not args.port:  # When no port override for non-WebSocket, default to 8883
    port = 8883

# Configure logging
logger = logging.getLogger("AWSIoTPythonSDK.core")
logger.setLevel(logging.ERROR)
streamHandler = logging.StreamHandler()
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
streamHandler.setFormatter(formatter)
logger.addHandler(streamHandler)

# Init AWSIoTMQTTClient
myAWSIoTMQTTClient = None
if useWebsocket:
    myAWSIoTMQTTClient = AWSIoTMQTTClient(clientId, useWebsocket=True)
    myAWSIoTMQTTClient.configureEndpoint(host, port)
    myAWSIoTMQTTClient.configureCredentials(rootCAPath)
else:
    myAWSIoTMQTTClient = AWSIoTMQTTClient(clientId)
    myAWSIoTMQTTClient.configureEndpoint(host, port)
    myAWSIoTMQTTClient.configureCredentials(rootCAPath, privateKeyPath, certificatePath)

# AWSIoTMQTTClient connection configuration
myAWSIoTMQTTClient.configureAutoReconnectBackoffTime(1, 32, 20)
myAWSIoTMQTTClient.configureOfflinePublishQueueing(-1)  # Infinite offline Publish queueing
myAWSIoTMQTTClient.configureDrainingFrequency(2)  # Draining: 2 Hz
myAWSIoTMQTTClient.configureConnectDisconnectTimeout(10)  # 10 sec
myAWSIoTMQTTClient.configureMQTTOperationTimeout(5)  # 5 sec

# Connect and subscribe to AWS IoT
myAWSIoTMQTTClient.connect()
print("Connected to AWS IoT...\n")

myAWSIoTMQTTClient.subscribe(subscribe_topic, 1, sub_callback)

# Setup GPIOs
setup_GPIO()

# Loop forever doing nothing
while True:
	time.sleep(1)
