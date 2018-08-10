

module.exports = function(line) {
  // mother of regexp
  // all reg expresions look crazy at first but they are acually quite simple and usefull
  // not my best but it is getting early in the morning
  let ip     = line.match(/((?<=\[)\d+:\d+:\d{4}(?=\/))/g);
  let time   = line.match(/(?<=\/)\d{6}.\d{3}(?=:)/g);
  let level  = line.match(/(?<=:)([A-Za-z]+)(?=:)/g);
  let origin = line.match(/(?<=[A-Za-z]:)(.+[^\]])(?=])/g);
  let msg    = line.match(/(?<= ")(.+)(?=" )/g);
  let extra  = line.match(/(?<=(" | \{)).+(?=(|\}))/g);

  // let parsedLine = line.match(/((?<=\[)\d+:\d+:\d{4}(?=\/)|(?<=\/)\d{6}.\d{3}(?=:)|(?<=:)(\w+)(?=:)|(?<=:)(.+[^\]])(?=])|(?<= ")(.+)(?=" )|(?<=(" | \{)).+(?=(|\})))/g)
  return {
    ipAddress: ip ? ip[0]: ip,
    time: time ? time[0] : time,
    level: level ? level[0] : level,
    origin: origin ? origin[0] : origin,
    msg: msg ? msg[0] : msg,
    extra: extra ? extra[0] : extra
  }
}
