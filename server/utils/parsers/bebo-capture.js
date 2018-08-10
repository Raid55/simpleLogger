

module.exports = function(line) {
  // mother of regexp
  // all reg expresions look crazy at first but they are acually quite simple and usefull
  // not my best but it is getting early in the morning
  let time   = line.match(/\d{4}-\d{2}-\d{2}T\d{2}(:\d{2}){2}\.\d{6}Z/g);
  let level  = line.match(/(?<=\t)\w+(?= )/g);
  let origin = line.match(/(?<=\[).+(?=\])/g);
  let msg    = line.match(/(?<=\t").+(?=")/g);

  // let parsedLine = line.match(/((?<=\[)\d+:\d+:\d{4}(?=\/)|(?<=\/)\d{6}.\d{3}(?=:)|(?<=:)(\w+)(?=:)|(?<=:)(.+[^\]])(?=])|(?<= ")(.+)(?=" )|(?<=(" | \{)).+(?=(|\})))/g)
  return {
    time: time ? time[0] : time,
    level: level ? level[0] : level,
    origin: origin ? origin[0] : origin,
    msg: msg ? msg[0] : msg
  }
}
