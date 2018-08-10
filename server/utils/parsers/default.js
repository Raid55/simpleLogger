// if file is not recognized

module.exports = function(line) {
  return {
    time: null,
    level: null,
    trigger: null,
    msg: line
  }
}
