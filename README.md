# simpleLogger
a server side and client side logger

lots of spelling mistakes, this is just a first run and a boilerplate, it will change over time


## TASK
Logging is a big problem for any client-side app, more specifically there's a couple needs:

1) different services (in different languages) that run on the client side needs logs
2) available for developers in a “reasonable” amount of time
3) parsed into a common format, some details like time/log level are consistent and a free-form message field
4) streaming is an intensive network operation, we need to limit the upload speed to not affect video

The code challenge is to create a client & server side app that manages log sending, parsing, and storage. 


- client side log sender
    * pickup logs from a specific folder
    * allow multiple log files (different services)
    * log files may of multiple types:
        * time based (service will write a new file with a time in the filename), 
            * log sender would need to take the file when its ready and delete it after it's sent to the server
        * single file 
            * some services like chrome or gstreamer can only write to 1 location, they overwrite the file when they're done with it (chrome every time it opens)
            * log sender needs to tail the file for new lines and batch send them up
* server side parser
    * accept the logs from log sender client
    * take the log lines and parse them into a json format
    * write json to a file (each json “event” is a new line)
        * the json event should include: log_level, event_dttm, message as fields (feel free to add other relevant ones if you want)


Notes:

* Log sender would be ideally windows based (since tailing/opening files on windows is different than linux) if you dont' have a windows PC feel free to use any os
* You can write code in any language, host it however
* make sure you use github and commit as you would on any team, we want to see your thought process as you start the project → complete
* server side would run on linux, should probably accept via http / ws / some non-custom protocol




### Before coding

From what I understand I need to take the logs from one folder, that will presumably be in different formats but will have predictable file names, send them over HTTP (could of done it over WS but I'm nervous and time is of the essence) to the backend server where they will be parsed and stored in a master log file. My plan of attack is as follows:

#### CLIENT SIDE
- first I am going to write a simple client, its job is to watch a folder for changes, whenever it detects a "rename" event it will copy the file, turn each line into an object where the key will be the line number than the line, and then send it all as JSON to the endpoint. 
    - For the google chrome file it hets a bit tricky, since the file never gets deleted and is a constant stream I thought about two ways to tackle those. First I can just dump the whole file as one request at the end of the loggers life, a simple function can be called when logger or app is closing and it can send the whole log in one go, on the other hand I can try to see how to tail the last 9 lines and when a change occurs we count the amount of new lines, if its over 10 we take those 10 lines and send them to the server until the end of the app where the remaining lines get sent no matter the amount. both techniques are flimsy to me since its a new concept but I think that I should first handle the time-based files and see where things take me from there.
    - For the time-based files, it's going to be straightforward. I am going to watch the folder for file updates, whenever a "rename" gets triggered it means that a file was either created, renames or destroyed. I simply check if the file exists using another FS method and if it does that means it was created or renamed so the file has to be uploaded then deleted since deleting the file will cause another "rename" event I can ignore it since the FS method will return false
- next, I am thinking that the client should only depend on nodeJs core functionality and no dependencies, that means using HTTP requests.
- The goal would be to have a buffer file for the files that need tailing, that way when the file reaches a certain threshold it can be uploaded in one chunk to the server.
- a backup system called `backlog` is set in place to make sure that if anything fails throughout the process none of the logs will be lost. The files will be deleted but the JSON formatted individual log lines will stay in that file until it is successfully uploaded, after that its deleted.
#### SERVER SIDE
- I forgot to write much about the server side, in my opinion, the way I was thinking about the project the hard part would be the client. Not only for the purpose of this test but also in production. Balancing memory usage, optimizing the code to make as little calls as possible. Also balancing the number of calls and lowering the upload limit to not hinder the main product are all problems that do not show up on the backend since it's a scalable server that only handles simple post requests and a write stream. I wanted to keep the backend simple so I went with express and regex to parse the incoming logs.
- 
### After coding
This project at first seemed complicated. I was introduced to some new concepts such as folder/file watching and reading only new bytes of information from a file. I had no point of reference and most GitHub reps that did the same thing used best different methods and did not align with this assignment at all. I took a shot in the dark and came up with a structure that I think holds up well for an alpha vers. I split up the time I had into 3 sections, research, coding/mini-documenting, testing/documenting. The research part gave me lots of options but overall I was on a time crunch so I just went to the nodeJs documentation hoping to find answers. It worked out in my favor and most of what I was looking for was there. Being completely new to this type of logger, I decided to make a class with an async function that would be called to start the logger.  Keeping modularity in mind, I also tried not to hardcode anything that did not need to be, making the client fairly configurable. The server was not a problem at all to set up and only took 30 minutes, writing the regular expressions was a bit annoying but is always a very rewarding process. Looking back now there are probably a few things I could have improved on. First and foremost is code readability. I coded pretty fast and came up with solutions without thinking of alternatives for the sake of getting something that works. That not only made the code hard to read but also made changing one thing kind of hard. I decided to change the structure halfway through upon realizing that I was coding the project only for the tailed files and did not account for one time the timestamped files. After realizing I took a step back, wrote a few ideas I had, took a walk, and rethought my strategy. While the code is better than it was on my first run it still could use some improvements such as promises, refactoring, getting rid of some steps between reading and sending logs and overall improving variable and function names. Given more time I think I could have done a better job, now I understand a bit more about logging and thinking of a different way to approach the situation is a lot easier than yesterday afternoon when the concept was new.
#### CLIENT SIDE
If I have time I will document the client's flow here:
### 

### SETUP
In order to set up the logger, you first need to download nodeJs and npm (they come together). Afterward, clone the repo and move into the server folder. There you will need to `npm i` to install the few dependencies needed for the server "express, body-parser, morgan (for logging...), and chalk because colors are nice". using node index.js in the server directory will start up the server.

- By default, the server is set to the following env variables but you can change them by adding them to your .bashrc or any way you prefer.
  - SL_LOG_PATH`: The path and name of the file where logs will be appended to. Defaults to `./master.log`
  - `SL_HOST`: The host, this is purely for logging and really doesn't matter. Defaults to `localhost`
  - `SL_PORT`: This can be used to set the port,  remember to what you set this you will need to provide it to the bot on startup otherwise it defaults to `8080`.
        
- Now we can set up the set up the logger. The logger is super simple to set up, all you have to do is import it into any file, preferably an index file that will run with your app. Ensuite you have to configure it. You can pass the following variables in order to `new Logger()`
  - `logsPath`: path to logs folder, defaults to: `./logs`
  - `clientID`: every log is sent with an ID attached, this is to sort logs better by user. By default its a random INT
  - `interval`: not the best name but this is the amount in bytes that will trigger the buffer be uploaded to the server, defaults at 5555, my lucky number is 55 so 2 times the luck.
  - `watchFiles`: is an array of files that need tailing, they aren't deleted instead they are the files that once updated, only the new bytes will be dumped into the buffer until it reaches the threshold set with `interval`. It defaults to all the files that were provided with the task with the exclusion of the timestamped files
  - `endpoint` is an object, `{host: <ip of server | defaults to localhost>, port: <port for HTTP connection | defaults to 8080>}`
- All of the init variables can be left blank since they all have a default value, all you have to do once you have your new logger class created is call the method `.run()`. That method will watch the files and POST all logs to the host provided.


### BUGS
I did my best to squash as many bugs as possible but I did not have the time to make a test suite, so all tests where done manually by dragging and dropping files in the folder, writing setInterval scripts to write to the file rapidly to see if the handled every line, making sure no line was added twice, ensure that all log lines sent to the server where properly formatted with the info needed to parse them server side, and of course making sure it works in any order. I am sure there are a couple of unhandled errors that can crash the logger and in turn any app that is attached to it but it would be an edge case. 

### Missing Features

- Logging the logger: all errors are just console logged, after writing the readme I'm going to try to add that but I don't want to push the time past 12
- Multiline logs: there are some logs that are multi-lined, This alpha version does not handle them and treats each individual line as a log. in order to compensate for this all the original unparsed lines are kept in the master.log as well as the parsed object for easy searching.
- Edge case logs: once every 100 lines there is a one-line log that is different from other logs, It doesn't have a clear identifiable pattern and is a pain to deal with, but it could be fixed with some regex magic and a few well placed if statements. 
- No upload limit: There is currently no limit how fast the JSON payload can be sent. However, since there is a delay one the buffer the size of the payload and the frequency of POST requests can be changed.


### Final notes
Overall it was a fun and challenging project. I was expecting an API challenge or something along those lines but this was very refreshing. It made me think outside the box and gave me a problem to solve that I did not know how to solve and had no point of reference to look for help other than great documentation by the nodeJS team.

##### Coded by Raid55 (Nicholas Boutboul)
