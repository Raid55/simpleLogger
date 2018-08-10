

module.exports = function(line) {
  // mother of regexp
  // all reg expresions look crazy at first but they are acually quite simple and usefull
  // not my best but it is getting early in the morning
  let parsedLine = line.match(/((?<=\[)\d+:\d+:\d{4}(?=\/)|(?<=\/)\d{6}.\d{3}(?=:)|(?<=:)(\w+)(?=:)|(?<=:)(.+[^\]])(?=])|(?<= ")(.+)(?=" )|(?<=(" | \{)).+(?=(|\})))/g)
  return {
    ipAddress: parsedLine[0],
    time: parsedLine[1],
    level: parsedLine[2],
    origin: parsedLine[3],
    msg: parsedLine[4],
    extra: parsedLine.length === 6 ? parsedLine[5]: null
  }
}
