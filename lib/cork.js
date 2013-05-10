// # Cork #
//
// #### Cork is a micro-framework for javascript based on flask. ####
//
// It implements a nice api which was inspired by flask's use of decorator
// expressions. It is still a work in progress, so feel free to pitchin.
module.exports = Cork

var StreamHandler = require('./stream_handler')
  , http = require("http")
  , url = require("url")
  , Stream = require("stream")
  , nodeStatic = require("node-static")


// Initialize Cork with an array of routes
function Cork(static_root){
  this.static_root = static_root
  this.routes = []
}



var proto = Cork.prototype
  , cons = Cork
proto.constructor = cons


// ## Methods 
//
//
// ** `.route(route)`
// This method takes a route, and instantiates a StreamHandler to handle
// requests emitted to the route. Returns the route so that the user can define
// accompanying methods. 
//
// Note that the user *can* implement multiple listeners for the same route,
// in which case the last one defined will override the others. This shouldn't
// be encouraged-- old routes will not be deleted.

proto.route = function(){
  // duplicates are okay, but order matters.
  var routes = [].slice.call(arguments)
    , new_route = new StreamHandler 
  this.routes.push({regexen: routes, response: new_route})
  return new_route
}



// ** `.get(pathname)`
// This finds the a route matching a pathname (as defined
// [here](http://nodejs.org/docs/latest/api/url.html#url_url) if it can.
// Otherwise it returns a stream that only emits 404 events

proto.get = function(pathname){
  // Descends so later routes overrride earlier routes.
  var target 
  for (var i = this.routes.length -1; i >= 0; --i){
    for (var j = 0, len = this.routes[i].regexen.length; j < len; ++j){
      if (new RegExp(this.routes[i].regexen[j]).test(pathname)) {
        target = this.routes[i].response
        break
      }
    }
  }
  return target
}


// ** `.run(port)`
//
//  Starts up an http server. This handles the events emitted by
//  [StreamHandler](./stream_handler.js)
proto.run = function(port){
  var self = this
    , file = new(nodeStatic.Server)(this.static_root)
    , server = http.createServer(cork_server)

  function cork_server(req, resp) {
    var parsed = url.parse(req.url, true)
      , pathname = parsed.pathname
      , query = parsed.query || {}
      , stream

    response_stream = self.get(pathname)

    if (!response_stream) {
      resp.writeHead(404, {'content-type': 'text/plain'})
      process.nextTick(function(){ resp.end("blergh blergh blergh")})
    } else {
      response_stream.stream
        .on("headers", function(headers){
          resp.writeHead(200, headers)
        })
        .on("data", function(data){
          +resp.write(data)
        })
        .on("end", function(data){
          resp.end(data)
        })

      response_stream.stream.emit(req.method, req)
    }
  }

  server.listen(port)
}
