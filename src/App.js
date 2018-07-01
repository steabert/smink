import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';

/**
 * React library to simplify drawing elements inside an svg tag.
 * The idea is that the outer "Svg" component passes basis transformation
 * functions down to its children through the use of a context.
 * The children can be separately implemented and receive the ability
 * to convert the user coordinates (used by the one who is drawing elements)
 * into svg coordinates for rendering onto the svg element.
 */

class App extends Component {
  state = {
    pos1: [3333, 3333],
    pos2: [2000, 5000]
  }

  onUpdate = (pos) => {
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
        <Svg width={400} height={300} userBasis={[[0, 0], [9999, 9999]]}>
          <SvgCircle pos={this.state.pos1} onUpdate={(pos) => this.setState({pos1: pos})} />
          <SvgCircle pos={this.state.pos2} onUpdate={(pos) => this.setState({pos2: pos})} />
          <rect x={5} y={5} width={10} height={10} />
        </Svg>
      </div>
    );
  }
}

// Prototype of an Svg implementation with basis transform capabilities.

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
 *
 * To allow n * pi/2 rotations to map the space onto itself
 * an intermediate basis is used with a centered origin and
 * equal distance to the edges, called the normalized basis.
 */

const DEFAULT_USER_BASIS = [[0, 0], [9999, 9999]]
const NORMALIZED_BASIS = [[-1, 1], [1, -1]]

const svgBasisTransform = (w, h, [[x0, y0], [x1, y1]]) => {
  return [
    [w / (x1 - x0),             0, w * x0 / (x0 - x1)],
    [            0, h / (y1 - y0), h * y0 / (y0 - y1)],
    [            0,             0,                  1]
  ];
}

// const getUserBasis = (w, h, [[x0, y0], [x1, y1]]) => {
//   return [
//     [(x1 - x0) / w,             0, x0],
//     [            0, (y1 - y0) / h, y0],
//     [            0,             0,  1]
//   ];
// }

const isAffine = (A) => {
  return A[2][0] === 0 && A[2][1] === 0 && A[2][2] === 1
}

const assertAffine = (A) => {
  if (!isAffine(A)) {
    throw new Error('expected affine transform')
  }
}

const inverse = (A) => {
  assertAffine(A);
  const [a, b, c] = A[0];
  const [d, e, f] = A[1];
  const D = a * e - d * b
  if (D === 0) {
    throw new Error('expected non-singular matrix')
  }

  const R = [
    [ e / D, -b / D],
    [-d / D,  a / D]
  ]

  const T = [
    -(c * R[0][0] + f * R[0][1]),
    -(c * R[1][0] + f * R[1][1])
  ]

  return [
    [R[0][0], R[0][1], T[0]],
    [R[1][0], R[1][1], T[1]],
    [      0,       0,    1]
  ]
}

const multiply = (A, B) => {
  assertAffine(A);
  assertAffine(B);
  const [a, b, c] = A[0];
  const [d, e, f] = A[1];
  const [t, u, v] = B[0];
  const [x, y, z] = B[1];
  return [
    [a * t + b * x, a * u + b * y, a * v + b * z + c],
    [d * t + e * x, d * u + e * y, d * v + e * z + f],
    [            0,             0,                 1]
  ]
}

const apply = (A, [x, y]) => {
  return [
    A[0][0] * x + A[0][1] * y + A[0][2],
    A[1][0] * x + A[1][1] * y + A[1][2]
  ];
}

const SminkContext = React.createContext('smink');

class Svg extends React.Component {
  static defaultProps = {
    userBasis: DEFAULT_USER_BASIS
  }
  render () {
    // Set up basis transform from user to svg space:
    // p_s = B_su p_u
    let B_su = svgBasisTransform(
      this.props.width, this.props.height, this.props.userBasis
    );
    if (this.props.transform) {
      // Use intermediate space to perform a transform
      // p_s = B_sn T_nn B_nu p_u
      const B_sn = svgBasisTransform(
        this.props.width, this.props.height, NORMALIZED_BASIS
      );
      // B_nu can be computed from
      // p_s = B_sn p_n = B_su p_u and p_n = B_nu p_u
      // => p_n = B_sn^-1 B_su p_u
      // => B_nu = B_sn^-1 B_su
      const B_nu = multiply(inverse(B_sn), B_su)
      B_su = multiply(B_sn, multiply(this.props.transform, B_nu))
    }
    const B_us = inverse(B_su)
    const toSvgBasis = (p) => apply(B_su, p);
    const toUserBasis = (p) => apply(B_us, p);

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
  // For now, we use the key property to force a re-render,
  // which is a bit simpler.
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
