<p align="center">

<img src="https://github.com/homebridge/branding/raw/latest/logos/homebridge-wordmark-logo-vertical.png" width="150">

</p>

<span align="center">

# homebridge-airthings-wave2

[Homebridge](https://github.com/nfarina/homebridge) plugin for both Wave (first generation) and Wave Plus 
radon sensors from [Airthings](https://www.airthings.com/).  Requires bluetooth capable computer running
Linux (macOS and Windows not supported per node-ble limitations) that communicates directly with the the
Wave/Wave Plus (automatic detection of Wave type) without the need of a hub.  Compatible with Homebridge v2.
Reads the following values:
* Temperature
* Humidity
* Radon short-term average
* Radon long-term average
* Atmospheric pressure (Wave Plus only)
* Carbon dioxide level (Wave Plus only)
* Volatile organic compounds level (Wave Plus only)

Note that radon, pressure and VOC can only be viewed using the Eve app (and others) but not in the Home app.
However, these values can be accessed using Automation shortcuts in the Home app and in Node-Red using
appropriate nodes so they can be automatically logged to a database if needed.

# Build Instructions

Make sure you are using a bluetooth (BLE) capable Linux computer and that it is located within range of the Airthings Wave 
/ Wave Plus.

## Installation
1.  Make sure bluez is installed
2.  Follow the directions for the use of [node-blu](https://github.com/chrvadala/node-ble) listed the github page 
3.	From the terminal inside the Homebridge UI run the following
    `npm install https://github.com/HSkul/homebridge-airthings-wave2`
4.  Update your configuration file - see below for an example

## Configuration
* `platform`: "AirthingsWavePlugin"
* `name`: descriptive name
* `name_temperature` (optional): descriptive name for the temperature sensor
* `name_humidity` (optional): descriptive name for the humidity sensor
* `address`: bluetooth address of Wave/Wave Plus
* `refresh`: Optional, time interval for refreshing data in seconds, defaults to 1h

Example configuration:
```json
        "platform": "AirThingsWavePlugin",
            "name": "AirThings Wave",
            "devices": [
                {
                    "name": "MyWave",
                    "name_temperature": "Wave Temperature",
                    "name_humidity": "Wave Humidity",
                    "refresh": 1800,
                    "address": "aa:bb:cc:dd:ee:ff"
                },
                {
                    "name": "MyWavePlus",
                    "name_temperature": "WavePlus Temperature",
                    "name_humidity": "WavePlus Humidity",
                    "name_CO2": "WavePlus Carbon Dioxide",
                    "refresh": 1800,
                    "address": "11:22:33:44:55:66"
                }
            ]
```
