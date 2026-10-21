import { Component } from "react"

// One broken panel must never blank the whole page and lose a finished guide.
// Wrap each section: on a render error only that section shows a short note,
// everything else (the guide, the exports) keeps working.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error(`[${this.props.name || "section"}]`, error, info?.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div role="alert" className="rounded-xl border border-amber-500/30 bg-amber-950/20 px-4 py-3 text-sm text-amber-200">
        <b>{this.props.name || "This section"} could not be shown.</b> Your guide is safe and you can still export it.
        <button
          onClick={() => this.setState({ error: null })}
          className="ml-3 text-xs underline text-amber-100 hover:text-white"
        >
          Try again
        </button>
        <div className="mt-1 text-xs text-amber-200/70">{String(this.state.error?.message || this.state.error)}</div>
      </div>
    )
  }
}
