
(function() {

  var socket, term;

  term = new Terminal({
    convertEol: true,
    cursorBlink: true
  });
  term.open(document.getElementById('terminal'));

  var protocol = (location.protocol === 'https:') ? 'wss://' : 'ws://';

  function connectWS(){
      console.log("Connecting...");

      socket = new WebSocket(protocol + document.location.host);
      socket.onclose = function() {
        term.write("\n== disconnected ==\n");
        setTimeout(connectWS, 1000);
      }

      socket.onopen = () => {
        term.write("\n== connected ==\n");
      };
      socket.onmessage = (ev) => {
        var msg;
        try {
          msg = JSON.parse(ev.data);
        } catch (e) {
          console.log(message.data);
          return;
        }
        if (msg.type == "data") {
          term.write(msg.data.replace(/[\x7F]/g, "\b \b"));
        }
      };
  }
  
  connectWS();

  term.on('data', d => {
    socket.send(JSON.stringify({ type: 'data', data: d }));
  })
  
  window.addEventListener("resize", resizeThrottler, false);

  var resizeTimeout;
  function resizeThrottler() {
    if ( !resizeTimeout ) {
      resizeTimeout = setTimeout(function() {
        resizeTimeout = null;
        resizeHandler();     
       }, 66);
    }
  }

  function resizeHandler() {
    fit.fit(term);
    socket.send(JSON.stringify({ type: 'resize', rows: term.rows, cols: term.cols }));
  }
  
  resizeHandler();

}());
