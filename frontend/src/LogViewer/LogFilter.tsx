import React from "react"
import {Spinner, Form, Col, Button} from "react-bootstrap"
import {FormState} from "./types"

interface LogFilterProps {
  handleChange: (e: React.ChangeEvent<any>, name: string) => void
  handleSubmit: (e: React.ChangeEvent<any>) => void
  loading: boolean
  onCheckboxChange: React.EventHandler<React.ChangeEvent<any>>
  state: FormState
}

const LogFilter: React.FC<LogFilterProps> = ({
  handleChange,
  handleSubmit,
  loading,
  onCheckboxChange,
  state,
}) => {
  return (
    <Form onSubmit={handleSubmit} className="mb-3">
      <Form.Row>
        <Col>
          <Form.Control
            placeholder="Query"
            name="query"
            onChange={(e) => handleChange(e, "query")}
            value={state.query || ""}
          />
        </Col>
        <Col>
          <Form.Control
            placeholder="Start date"
            name="startDate"
            type="date"
            onChange={(e) => handleChange(e, "startDate")}
            value={state.startDate || ""}
          />
        </Col>
        <Col>
          <Form.Control
            placeholder="End date"
            name="endDate"
            type="date"
            onChange={(e) => handleChange(e, "endDate")}
            value={state.endDate || ""}
          />
        </Col>
        <Col md="auto">
          <Button variant="success" disabled={loading} type="submit">
            {loading && (
              <Spinner animation="border" role="status" size="sm">
                <span className="sr-only">Loading...</span>
              </Spinner>
            )}{" "}
            Filter
          </Button>
        </Col>

        <Col style={{alignSelf: "center"}}>
          <Form.Check
            checked={state.autoRefresh || false}
            type="checkbox"
            label="Auto refresh"
            inline
            onChange={onCheckboxChange}
          />
        </Col>
      </Form.Row>
    </Form>
  )
}

export default LogFilter
