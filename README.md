# simpleLogger
a server side and client side logger

lots of spelling mistakes, this is just a first run and a boilerplate, it will change over time


### task
Logging is a big problem for any client side app, more specifically there's a couple needs:

1) different services (in different languages) that run on the client side needs logs
2) available for developers in a “reasonable” amount of time
3) parsed into a common format, some details like time / log level are consistent and a free form message field
4) streaming is an intensive network operation, we need to limit the upload speed to not affect video

The code challenge is to create a client & server side app that manages log sending, parsing and storage. 


- client side log sender
    * pickup logs from a specific folder
    * allow mutliple log files (different services)
    * log files may of multiple types:
        * time based (service will write a new file with a time in the filename), 
            * log sender would need to take the file when its ready and delete it after it's sent to the server
        * single file 
            * some services like chrome or gstreamer can only write to 1 location, they overwrite the file when they're done with it (chrome everytime it opens)
            * log sender needs to tail the file for new lines and batch send them up
* server side parser
    * accept the logs from log sender client
    * take the log lines and parse them into a json format
    * write json to a file (each json “event” is a new line)
        * the json event should include: log_level, event_dttm, message as fields (feel free to add other relevant ones if you want)


Notes:

* Log sender would be ideally windows based (since tailing / opening files on windows is different than linux) if you dont' have a windows PC feel free to use any os
* You can write code in any language, host it however
* make sure you use github and commit as you would on any team, we want to see your thought process as you start the project → complete
* server side would run on linux, should probably accept via http / ws / some non custom protocal




### Before coding

From what I understand I need to take the logs from one folder, that will presumably be in different formats but will have predictable file names, send them over http (could of done it over ws but im nervous and time is of the essence) to the backend server where they will be parsed and stored in a master log file. My plan of attack is as follows

#### CLIENT SIDE
- first I am going to write a simple client, its job is to watch a folder for changes, whenever it detects a "rename" event it will copy the file, turn each line into an object where the key will be the line number then the line, and then send it all as json to the endpoint. 
    - For the google chrome file it hets a bit tricky, since the file never gets deleted and is a constant stream I thought about two ways to tackle those. First I can just dump the whole file as one request at the end of the loggers life, a simple function can be called when logger or app is closing and it can send the whole log in one go, on the other hand I can try to see how to tail the last 9 lines and when a change occures we count the ammount of new lines, if its over 10 we take thoes 10 lines and send them to the server until the end of the app where the remaning lines get sent no matter the amount. both techniques are flimsy to me since its a new concept but I think that I should first handle the time based files and see where things take me from there.
    - For the time based files its going to be straight foward. I am going to watch the folder for file updates, whenever a "rename" gets triggered it means that a file was either created, renames or destroyed. I simply check if the file exists using another FS method and if it does that means it was created or renamed so the file has to be uploaded then deleted, since deleting the file will cause another "rename" event I can ignore it since the FS method will return false
#### SERVER SIDE
