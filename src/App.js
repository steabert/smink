import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';

class App extends Component {
  state = {
    pos: [3333, 3333]
  }

  onUpdate = (pos) => {
    console.log('update!', pos)
    this.setState({pos}) // Optional! this will cause a re-render in the DOM!
  }

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h1 className="App-title">Welcome to React</h1>
        </header>
        <p className="App-intro">
          To get started, edit <code>src/App.js</code> and save to reload.
        </p>
        <Svg width={400} height={300} coordinateSystem={[[0, 9999], [0, 9999]]}>
          <SvgCircle2 pos={this.state.pos} onUpdate={this.onUpdate} />
          <rect x={5} y={5} width={10} height={10} />
        </Svg>
      </div>
    );
  }
}

const SminkContext = React.createContext('smink');

class Svg extends React.Component {
  toPixels = ([x, y]) => {
    return [
      (x / this.props.coordinateSystem[0][1]) * this.props.width,
      (y / this.props.coordinateSystem[1][1]) * this.props.height
    ];
  }

  toCoords = ([x, y]) => {
    return [
      (x / this.props.width) * this.props.coordinateSystem[0][1],
      (y / this.props.height) * this.props.coordinateSystem[1][1]
    ];
  }

  render () {
    return (
      <SminkContext.Provider value={{toPixels: this.toPixels, toCoords: this.toCoords}}>
        <svg width={this.props.width} height={this.props.height} style={{border: 'solid red'}}>
          {this.props.children}
        </svg>
      </SminkContext.Provider>
    );
  }
}

const WithSminkTransforms = (Component) => {
  let id = 0;

  return (props) => {
    return (
      <SminkContext.Consumer>
        {({toPixels, toCoords}) => {
          return (
            <Component key={id++} {...props} toCoords={toCoords} toPixels={toPixels} />
          );
        }}
      </SminkContext.Consumer>
    );
  }
}

class SvgCircle extends React.Component {
  constructor (props) {
    super(props)
    this.id = 0;
  }

  render () {
    return (
      <SminkContext.Consumer>
        {({toPixels, toCoords}) => {
          const pxPos = toPixels(this.props.pos);

          return (
            <Circle
              pos={pxPos}
              key={this.id++}
              toCoords={toCoords}
              onUpdate={this.props.onUpdate}
            />
          );
        }}
      </SminkContext.Consumer>
    );
  }
}

class Circle extends React.Component {
  state = {
    pos: this.props.toPixels(this.props.pos)
  }

  handleMouseDown = (e) => {
    this.origin = this.state.pos;
    this.mouseOrigin = [e.pageX, e.pageY];
    document.addEventListener('mousemove', this.handleMouseMove);
  }

  handleMouseMove = (e) => {
    this.setState({
      pos: [
        this.origin[0] + (e.pageX - this.mouseOrigin[0]),
        this.origin[1] + (e.pageY - this.mouseOrigin[1])
      ]
    })
  }

  handleMouseUp = (e) => {
    document.removeEventListener('mousemove', this.handleMouseMove);
    const coords = this.props.toCoords(this.state.pos);
    this.props.onUpdate(coords)
  }

  render () {
    return (
      <circle
        r={10}
        cx={this.state.pos[0]}
        cy={this.state.pos[1]}
        onMouseDown={this.handleMouseDown}
        onMouseUp={this.handleMouseUp}
      />
    );
  }
}

const SvgCircle2 = WithSminkTransforms(Circle);

export default App;
