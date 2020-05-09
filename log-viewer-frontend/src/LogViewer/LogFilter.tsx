import React from "react"
import {
  Spinner,
  Form,
  Col,
  Button,
} from "react-bootstrap"


interface LogFilterProps {
    handleChange: (e: React.ChangeEvent<any>, name: string) => void
    handleSubmit: (e: React.ChangeEvent<any>) => void
    loading: boolean
    autoRefresh: boolean
    onCheckboxChange: React.EventHandler<React.ChangeEvent<any>>
  }
  
  const LogFilter: React.FC<LogFilterProps> = ({
    handleChange,
    handleSubmit,
    loading,
    autoRefresh,
    onCheckboxChange,
  }) => {
    return (
      <Form onSubmit={handleSubmit} className="mb-3">
        <Form.Row>
          <Col>
            <Form.Control
              placeholder="Query"
              name="query"
              onChange={(e) => handleChange(e, "query")}
            />
          </Col>
          <Col>
            <Form.Control
              placeholder="Start date"
              name="startDate"
              type="date"
              onChange={(e) => handleChange(e, "startDate")}
            />
          </Col>
          <Col>
            <Form.Control
              placeholder="End date"
              name="endDate"
              type="date"
              onChange={(e) => handleChange(e, "endDate")}
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
              checked={autoRefresh}
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