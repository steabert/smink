import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';

class App extends Component {
  state = {
    pos1: [3333, 3333],
    pos2: [2000, 5000]
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
        <Svg width={400} height={300} userBasis={[[0, 0], [9999, 9999]]} transform={transform}>
          <SvgCircle pos={this.state.pos1} onUpdate={(pos) => this.setState({pos1: pos})} />
          <SvgCircle pos={this.state.pos2} onUpdate={(pos) => this.setState({pos2: pos})} />
          <rect x={5} y={5} width={10} height={10} />
        </Svg>
      </div>
    );
  }
}

/**
 * Set up basis transforms.
 * The svg basis is defined as:
 *
 * (0,0)      (w,0)
 *   +----------+
 *   |          |
 *   |          |
 *   |          |
 *   +----------+
 * (0,h)      (w,h)
 *
 * where the top left corner is the origin, and the bottom
 * right corner corresponds to the width and height of the
 * svg element.
 *
 * A user basis can be defined to allow the use of
 * custom coordinates instead of those based on
 * width and height of the svg element.
 * The basis that can be chosen is limited to a
 * rectangular overlay, defined by two outer points:
 *
 * (x0,y0)    (x1,y0)
 *    +----------+
 *    |          |
 *    |          |
 *    |          |
 *    +----------+
 * (x0,y1)    (x1,y1)
 *
 * The user basis is passed as a prop with data
 * [[x0, y0], [x1, y1]], and if not specified the default
 * corresponds to [[0, 1], [1, 0]].
 */

const getSvgBasis = (w, h, [[x0, y0], [x1, y1]]) => {
  return [
    [w / (x1 - x0),             0, w * x0 / (x0 - x1)],
    [            0, h / (y1 - y0), h * y0 / (y0 - y1)],
    [            0,             0,                  1]
  ];
}

const getUserBasis = (w, h, [[x0, y0], [x1, y1]]) => {
  return [
    [(x1 - x0) / w,             0, x0],
    [            0, (y1 - y0) / h, y0],
    [            0,             0,  1]
  ];
}

const multiply = (A, [x, y]) => {
  return [
    A[0][0] * x + A[0][1] * y + A[0][2],
    A[1][0] * x + A[1][1] * y + A[1][2]
  ];
}

const SminkContext = React.createContext('smink');

class Svg extends React.Component {
  static defaultProps = {
    userBasis: [[0, 1], [1, 0]]
  }
  render () {
    const svgBasisTransfrom = getSvgBasis(
      this.props.width, this.props.height, this.props.userBasis
    );
    const userBasisTransform = getUserBasis(
      this.props.width, this.props.height, this.props.userBasis
    );
    const toSvgBasis = (p) => multiply(svgBasisTransfrom, p);
    const toUserBasis = (p) => multiply(userBasisTransform, p);
    return (
      <SminkContext.Provider value={{toSvgBasis, toUserBasis}}>
        <svg width={this.props.width} height={this.props.height} style={{border: 'solid red'}}>
          {this.props.children}
        </svg>
      </SminkContext.Provider>
    );
  }
}

const WithBasisTransforms = (Component) => {
  // Could be replaced with a getDerivedStateFromProps inside the
  // component itself, thus avoiding a re-render.
  let id = 0;

  return (props) => {
    return (
      <SminkContext.Consumer>
        {({toSvgBasis, toUserBasis}) => {
          return (
            <Component
              key={id++}
              {...props}
              toSvgBasis={toSvgBasis}
              toUserBasis={toUserBasis}
            />
          );
        }}
      </SminkContext.Consumer>
    );
  }
}

class Circle extends React.Component {
  state = {
    pos: this.props.toSvgBasis(this.props.pos)
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
    const coords = this.props.toUserBasis(this.state.pos);
    this.props.onUpdate(coords)
  }

  render () {
    const [x, y] = this.state.pos;

    return (
      <circle
        r={10}
        cx={x}
        cy={y}
        onMouseDown={this.handleMouseDown}
        onMouseUp={this.handleMouseUp}
      />
    );
  }
}

const SvgCircle = WithBasisTransforms(Circle);

export default App;
