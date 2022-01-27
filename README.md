# ECEF path generator
This is an application that generates ECEF coordinates from a drawn path on a map. 
The data generated can be used to generate GPS signal files for applications that 
simulate GPS signal [gps-sdr-sim](https://github.com/osqzss/gps-sdr-sim).

# Demo

[Working demo](http://46.32.229.68/ECEF/)


# Quick start:

* Click Settings, input the desire latitude and longitude where the map will be centered. 
Also the colours for the trail and mover can be customized.

* Over the map, draw a path using the mouse while pressing the left button, if it is needed
you can delete the last points drawn with the button Remove.

* Adjust the initial speed:
    - key W increment speed by 5km and Q decrement it by 5km,
    - key S increment speed by 2km and A decrement it by 2km,
    - key X increment speed by 1km and Z decrement it by 1km,
    - right arrow increment speed by 0.5km and left arrow decrement it by 0.5km,

* Adjust the altitude with up arrow (increment) and down arrow (decrement), altitued is in meters.

* Adjust the initial time elapsed. At x1 this means that the mover will take 15 seconds 
on a 1 kilometre path at 240 km/hr, at x2 it will take 7.5 (of real time), 
at x4 3.75 sec (of real time) and so on. This will not affect the recording.

* Click "Recorder / Player", click Record, a blue point will start moving along the drawn path. 
You can modify the speed as you wish.

* After finishes the recording, you can see the result by pressing the Play button.

* Zoom can be adjusted at any time.

# Documentation

* *Recorder / Player*
	* **Record** starts to record the position and speed of the mover. Once the recording has finished, speed can not be change. However it can be reset.
	* **Reset** reset the path ready to be recorded again from the beginning. Speed is override.
	* **Delete** delete the current path.
	* **Remove** as far as the path have not been recorded, clicking remove will remove the last point of the path, click it as needed to remove the many point.

* *More Actions*
	* **Settings** here you can set the latitude, longitude, altitude, zoom and colour for the path and mover.
	* **Export to ECEF** after recording, you can download the path in ECEF coordinates, you will need to input the frequency in Hertz for the sample data. To use with [gps-sdr-sim](https://github.com/osqzss/gps-sdr-sim") the sampling rate of the user motion has to be 10Hz. 
   * **Download data** this allows you to download the raw data a path was recorded, so you can import it later to play it, reset and change the speed and generate a different ECEF coordinate file.
