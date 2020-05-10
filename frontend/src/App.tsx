import React from "react"
import {BrowserRouter as Router, Route, Switch} from "react-router-dom"
import LogViewer from "./LogViewer"
import {Alert} from "react-bootstrap"

const NotFound = () => <Alert variant="danger">404, not found</Alert>

const App = () => (
  <Router>
    <Switch>
      <Route path="/" component={LogViewer} />
      <Route path="*" component={NotFound} />
    </Switch>
  </Router>
)

export default App
