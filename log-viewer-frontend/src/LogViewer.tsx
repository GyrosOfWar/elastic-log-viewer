import React, {useState} from "react"
import useAxios from "axios-hooks"
import {
  Table,
  Container,
  Spinner,
  Form,
  Col,
  Alert,
  Button,
  Modal,
} from "react-bootstrap"
import {AbsoluteDateTime} from "./DateHelpers"

type FormControlElement =
  | HTMLInputElement
  | HTMLSelectElement
  | HTMLTextAreaElement

interface FormState {
  query?: string
  startDate?: string
  endDate?: string
}

interface Hit {
  _source: any
  _id: string
  sort?: Array<any>
}

const LogViewer = () => {
  const [{data, loading, error}, refetch] = useAxios<Array<Hit>>(
    "/api/v1/logs?size=100"
  )
  const [form, setForm] = useState<FormState>({})
  const [selectedDetails, setSelectedDetails] = useState<Hit | null>(null)

  const handleClose = () => setSelectedDetails(null)

  if (error) {
    return <Alert variant="danger">{error.message}</Alert>
  }

  const onRowClicked = (row: Hit) => {
    setSelectedDetails(row)
  }

  const handleSubmit = async (e?: React.ChangeEvent<any>) => {
    e?.preventDefault()

    const params = new URLSearchParams()
    Object.entries(form)
      .filter((pair) => Boolean(pair[1]))
      .forEach(([key, value]) => params.set(key, value))
    params.set("size", "100")

    try {
      await refetch({
        url: `/api/v1/logs?${params.toString()}`,
      })
    } catch (error) {
      console.error(error)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<FormControlElement>,
    name: string
  ) => {
    const value = e.target.value
    setForm((oldForm) => {
      return {
        ...oldForm,
        [name]: value,
      }
    })
  }

  return (
    <Container fluid>
      <Modal
        show={Boolean(selectedDetails)}
        onHide={handleClose}
        animation={false}
        size="xl"
      >
        <Modal.Header closeButton>
          <Modal.Title>Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedDetails && (
            <ul>
              {Object.entries(selectedDetails._source).map(([key, value]) => (
                <li key={key}>
                  <strong>{key}:</strong> {JSON.stringify(value)}
                </li>
              ))}
            </ul>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={handleClose}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <h1 className="mb-3 mt-1">Logs</h1>
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
          <Col>
            <Button variant="success" disabled={loading} type="submit">
              {loading && (
                <Spinner animation="border" role="status" size="sm">
                  <span className="sr-only">Loading...</span>
                </Spinner>
              )}{" "}
              Filter
            </Button>
          </Col>
        </Form.Row>
      </Form>
      <Table size="sm" striped>
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Level</th>
            <th>Message</th>
          </tr>
        </thead>

        <tbody>
          {data?.map((row) => (
            <tr key={row._id} onClick={() => onRowClicked(row)}>
              <td>
                {<AbsoluteDateTime timestamp={row._source["@timestamp"]} />}
              </td>
              <td>{row._source["log.level"]}</td>
              <td>{row._source.message}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Container>
  )
}

export default LogViewer
