# alexa-controlmypi-skill
Repository for all code needed to build/handle alexa skill that controls GPIOs on Raspberry Pi
## System Block Diagram
![Block Diagram](/images/system_block_diagram.png)
## RPi
This directory contains the code to run on the Raspberry Pi that utilizes the Python AWS SDK to subscribe to topics and, when called, it publishes to a reserved MQTT topic to update the device shadow.
## Models
This directory contains the models used by ASK to generate the intents.
## Lambda
This directory contains the event based code that handles the Alexa intents.
