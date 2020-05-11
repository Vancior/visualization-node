"use strict"
class TumblingTime {
  constructor(size, unit, callback) {
    size = parseFloat(size)
    unit = parseFloat(unit)
    this.size = parseInt(size * unit * 1000)
    if (isNaN(this.size) || this.size <= 0) {
      throw Error("invalid window size: " + this.size.toString())
    }
    this.callback = callback
    this.data = new Array()
    setInterval(this.check.bind(this), this.size)
  }
  push(data) {
    this.data.push({ timestamp: Date.now(), data: data })
  }
  check() {
    let length = this.data.length
    if (length > 0) {
      // console.log(this.data)
      this.callback(this.data.splice(0, length))
    }
  }
}
class TumblingPoint {
  constructor(size, callback) {
    size = parseInt(size)
    this.size = size
    if (isNaN(this.size) || this.size <= 0) {
      throw Error("invalid window size: " + this.size.toString())
    }
    this.callback = callback
    this.data = new Array()
  }
  push(data) {
    this.data.push({ timestamp: Date.now(), data: data })
    if (this.data.length >= this.size) {
      this.callback(this.data.splice(0, this.size))
    }
  }
}
class SlidingTime {
  constructor(windowSize, windowUnit, slideSize, slideUnit, callback) {
    this.window = parseInt(
      parseFloat(windowSize) * parseFloat(windowUnit) * 1000
    )
    this.slide = parseInt(parseFloat(slideSize) * parseFloat(slideUnit) * 1000)
    if (isNaN(this.window) || this.window <= 0) {
      throw Error("invalid window size: " + this.window.toString())
    }
    if (isNaN(this.slide) || this.slide <= 0) {
      throw Error("invalid slide size: " + this.slide.toString())
    }
    this.callback = callback
    this.data = new Array()
    setTimeout(this.check.bind(this), this.window)
  }
  push(data) {
    this.data.push({ timestamp: Date.now(), data: data })
  }
  check() {
    let boundary = Date.now() - this.window
    let i = 0
    while (i < this.data.length) {
      if (this.data[i].timestamp >= boundary) break
      ++i
    }
    this.data.splice(0, i)
    this.callback(this.data.slice())
    setTimeout(this.check.bind(this), this.slide)
  }
}
class SlidingPoint {
  constructor(windowSize, slideSize, callback) {
    this.window = parseInt(windowSize)
    this.slide = parseInt(slideSize)
    if (isNaN(this.window) || this.window <= 0) {
      throw Error("invalid window size: " + this.window.toString())
    }
    if (isNaN(this.slide) || this.slide <= 0) {
      throw Error("invalid slide size: " + this.slide.toString())
    }
    this.callback = callback
    this.data = new Array()
    this.deleteCount = 0
  }
  push(data) {
    if (this.deleteCount > 0) {
      while (this.data.length > 0 && this.deleteCount > 0) {
        this.data.splice(0, 1)
        --this.deleteCount
      }
    }
    this.data.push({ timestamp: Date.now(), data: data })
    if (this.data.length >= this.window) {
      this.callback(this.data.slice(0, this.window))
      this.deleteCount = this.slide
    }
  }
}
module.exports = (RED) => {
  function buildNode(config) {
    RED.nodes.createNode(this, config)
    let node = this
    this.config = config

    try {
      let cb = function (data) {
        node.send({ payload: data })
      }
      switch (config.mode + "-" + config.element) {
        case "tumbling-time":
          this.window = new TumblingTime(
            config.tumblingTimeSize,
            config.tumblingTimeUnit,
            cb
          )
          break
        case "tumbling-point":
          this.window = new TumblingPoint(config.tumblingPointSize, cb)
          break
        case "sliding-time":
          this.window = new SlidingTime(
            config.tumblingTimeSize,
            config.tumblingTimeUnit,
            config.slidingTimeSlide,
            config.slidingTimeSlideUnit,
            cb
          )
          break
        case "sliding-point":
          this.window = new SlidingPoint(
            config.tumblingPointSize,
            config.slidingPointSlide,
            cb
          )
          break
        default:
          throw Error(
            "unknown mode: " + config.mode + ", element: " + config.element
          )
      }
    } catch (err) {
      node.error(err.message)
    }

    this.on("input", (msg) => {
      if (this.window != null) this.window.push(msg.payload)
    })
  }
  RED.nodes.registerType("window", buildNode)
}
