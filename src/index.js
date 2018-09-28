import React, { Component } from "react";
import PropTypes from "prop-types";
import styles, {
  defaultPlaceholderFilter,
  defaultPlaceholderScale,
  defaultTransitionDuration,
  defaultTransitionTimingFunction
} from "./index.css";

const strategies = {
  INSTANT: "instant",
  LAZY: "lazy",
  ON_CLICK: "on-click"
};

const loadingStates = {
  AWAITING: Symbol("AWAITING"),
  SHOULD_LOAD: Symbol("SHOULD_LOAD"),
  LOADED: Symbol("LOADED")
};

const isIntersectionObserverSupported = () =>
  "IntersectionObserver" in global &&
  "IntersectionObserverEntry" in global &&
  "intersectionRatio" in IntersectionObserverEntry.prototype;

export default class ProgressiveImg extends Component {
  static propTypes = {
    src: PropTypes.string,
    srcSet: PropTypes.string,
    sizes: PropTypes.string,
    alt: PropTypes.string,
    loadStrategy: PropTypes.oneOf(Object.values(strategies)),
    intersectionMargin: PropTypes.string,
    onStartLoading: PropTypes.func,
    onLoaded: PropTypes.func,
    onError: PropTypes.func,
    placeholderFilter: PropTypes.string,
    placeholderScale: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    transitionDuration: PropTypes.string,
    transitionTimingFunction: PropTypes.string,
    children: PropTypes.node
  };

  static defaultProps = {
    intersectionMargin: "200px",
    loadStrategy: strategies.LAZY,
    placeholderFilter: defaultPlaceholderFilter,
    placeholderScale: defaultPlaceholderScale,
    transitionDuration: defaultTransitionDuration,
    transitionTimingFunction: defaultTransitionTimingFunction
  };

  constructor(props) {
    super(props);
    const loadStrategy = props.loadStrategy;
    if (
      loadStrategy === strategies.INSTANT ||
      (loadStrategy === strategies.LAZY && !isIntersectionObserverSupported())
    ) {
      this.state = { loading: loadingStates.SHOULD_LOAD };
      if (props.onStartLoading) props.onStartLoading();
    } else {
      this.state = { loading: loadingStates.AWAITING };
    }
    this.element = React.createRef();
  }

  loadLarge = () => {
    if (this.state.loading === loadingStates.AWAITING) {
      this.setState({ loading: loadingStates.SHOULD_LOAD });
      if (this.props.onStartLoading) this.props.onStartLoading();
    }
  };

  largeLoaded = () => {
    this.setState({ loading: loadingStates.LOADED });
    if (this.props.onLoaded) this.props.onLoaded();
  };

  componentDidMount() {
    if (this.props.loadStrategy === strategies.LAZY) {
      this.observeVisibility(this.props.intersectionMargin);
    }
  }

  observeVisibility = intersectionMargin => {
    this.observer = new IntersectionObserver(
      nodes => {
        if (nodes[0].isIntersecting) {
          this.loadLarge();
          this.observer.disconnect();
        }
      },
      { rootMargin: intersectionMargin }
    );

    this.observer.observe(this.element.current);
  };

  render = () => {
    const {
      style,
      placeholder,
      children,
      intersectionMargin,
      loadStrategy,
      onStartLoading,
      onLoaded,
      onError,
      placeholderFilter,
      placeholderScale,
      transitionDuration,
      transitionTimingFunction,
      ...remainingProps
    } = this.props;
    /*
      intersectionMargin, loadStrategy, onStartLoading and onLoaded 
      aren't used in render method, but are destructured so they don't 
      end up in remainingProps - which are spread into top level div
    */
    const { loading } = this.state;

    const awaiting = loading === loadingStates.AWAITING;

    const { src, srcSet, sizes, alt, ...rest } = !awaiting
      ? remainingProps
      : {};

    return (
      <div
        ref={this.element}
        style={{
          ...style,
          "--placeholder-filter": placeholderFilter,
          "--placeholder-scale": placeholderScale,
          "--transition-timing-function": transitionTimingFunction,
          "--transition-duration": transitionDuration
        }}
        onClick={this.loadLarge}
        className={styles["container"]}
        loaded={(loading === loadingStates.LOADED).toString()}
      >
        <img
          src={placeholder}
          alt={this.props.alt}
          className={styles.placeholder}
          onError={this.loadLarge}
        />

        {children != null && (
          <div className={styles.loader} show={awaiting.toString()}>
            {children}
          </div>
        )}

        <img
          {...rest}
          src={src}
          srcSet={srcSet}
          sizes={sizes}
          alt={alt}
          onLoad={this.largeLoaded}
          onError={onError}
          className={styles.large}
        />
      </div>
    );
  };
}
