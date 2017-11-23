# HelloVideoCall
This is the practice project, contain react-native-webrtc + ios callkit

## WebRTC
This project add [react-native-webrtc](#https://github.com/oney/react-native-webrtc) and using it to connect to another peer. Here is described the flow of connection includes 3 component: Stream, PeerConnection(for ICE use) and SocketID(for signal server use). and 2 type of connections: 1. Join, join an existed room, 2. Create & Wait, create a room and wait for join.


### Init Single server
Before starting we using https://react-native-webrtc.herokuapp.com to be a single server. The app will connect to it at the begin.
```javascript
Socket = io.connect(https://react-native-webrtc.herokuapp.com)
```

### Init local stream
After single server connected, init local/self stream
```javascript
socket.on('connect', () => {
  getUserMedia({
    audio: true,
    video: {
        mandatory: {
            minWidth: 640, // Provide your own width, height and frame rate here
            minHeight: 360,
            minFrameRate: 30,
        },
        facingMode: (isFront ? "user" : "environment"),
        optional: (videoSourceId ? [{ sourceId: videoSourceId }] : []),
    }
  }, stream => {
    console.log('getUserMedia success', stream);
    callback(stream);
  }, logError);
}
```

### Join
1. Socket emit join with single server address.
```javascript
socket.emit('join', "your room id", socketIds => { ... })
```
2. Get socket ID from join callback and create PeerConnection and add local stream
```javascript
const pc = new RTCPeerConnection(configuration)
pc.addStream(localStream)
```

3. We will get on negotiation needed callback from peer connection then we create offer, set local description and exchange throuh socket
```javascript
pc.onnegotiationneeded = () => {
    pc.createOffer(desc => {
        pc.setLocalDescription(desc, () => {
            socket.emit('exchange', { 'to': socketId, 'sdp': pc.localDescription });
        }, logError);
    }, logError)
}
```

4. We will get on ICE candidate callback from peer connection and exchange candidate through socket
```javascript
pc.onicecandidate = (event) => {
    if (event.candidate)
        socket.emit('exchange', { 'to': socketId, 'candidate': event.candidate })
}
```

5. We will get on exchange socket then check the exchange data reply candidate, set remote. Note: the callback will be called many times.
```javascript
const exchange = data => {

    const fromId = data.from;
    let pc;
    if (fromId in pcPeers) {
        pc = pcPeers[fromId];
    } else {
        pc = createPC(fromId, false);
    }

    if (data.sdp) {
        pc.setRemoteDescription(new RTCSessionDescription(data.sdp),  () => {
            if (pc.remoteDescription.type == "offer")
               createAnswer(pc, fromId)
        }, logError);
    } 
    
    if (data.candidate) {
        console.log('exchange candidate:', data.candidate);
        pc.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
}
```
5. Finally, we get the remote stream on add stream through peer connection the whole connection is done.
```javascript
pc.onaddstream = (event) => {
  container.setState({ remoteURL: event.stream.toURL() });
}
```
### Create and Wait
1. socket emit join then get callback without any socket ID
```javascript
socket.emit('join', "your room id", socketIds => { ... })
```

2. We will get on change from the single server. 
###### Create Peer Connection withou offer
```javascript
const pc = new RTCPeerConnection(configuration)
```
###### Exchange ICE candidate
```javascript
const exchange = data => {
    if (data.candidate) {
        console.log('exchange candidate:', data.candidate);
        pc.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
}
```
###### Answer the offer
```javascript
const exchange = data => {
    if (data.sdp) {
        pc.setRemoteDescription(new RTCSessionDescription(data.sdp), () => {
            console.log(`pc.remoteDescription.type: `, pc.remoteDescription.type)
            if (pc.remoteDescription.type == "offer")
                createAnswer(pc, fromId)
        }, logError);
    }
}
```
3. Finally, we get the remote stream on add stream through peer connection the whole connection is done.
```javascript
pc.onaddstream = (event) => {
  container.setState({ remoteURL: event.stream.toURL() });
}
```

## How to get VoIP push notification even app not open?
Add react-native-voip-push-notification to project
Note:
1. Add "App provides Voice over IP services" to Required background modes in info.plist
2. Enable <my project>/Capabilities/Push Notifications
3. Package the main.jsbundle and using it to offline bundle in iOS then we can get push notification event app not open.

## How to connect WebRTC audio session in Callkit? 
Basically is activate our session after callkit activated audio session. 
