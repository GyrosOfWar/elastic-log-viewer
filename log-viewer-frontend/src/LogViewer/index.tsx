import React, {useState} from "react"
import useAxios from "axios-hooks"
import {
  Table,
  Container,
  Alert,
  Button,
  Modal,
} from "react-bootstrap"
import {RouteComponentProps} from "react-router-dom"
import {ExternalLink} from "react-feather"
import qs from "qs"

import {AbsoluteDateTime} from "../DateHelpers"
import LogFilter from "./LogFilter"

type FormControlElement =
  | HTMLInputElement
  | HTMLSelectElement
  | HTMLTextAreaElement

interface FormState {
  query?: string
  startDate?: string
  endDate?: string
  size?: number
}

// TODO create a mapping from those properties to elastic properties
interface LogLine {
  timestamp: string
  eventDataset: string
  logLevel: string
  logLogger: string
  message: string
  serviceName: string
  [key: string]: any
}

interface Hit {
  _source: any
  _id: string
  sort?: Array<LogLine>
}

const TableRow: React.FC<{row: Hit; onRowClicked: (row: Hit) => void}> = ({
  row,
  onRowClicked,
}) => {
  const data: LogLine = row._source

  return (
    <tr onClick={() => onRowClicked(row)}>
      <td>{<AbsoluteDateTime timestamp={data.timestamp} />}</td>
      <td>{data.logLevel}</td>
      <td>{data.serviceName}</td>
      <td>{data.message}</td>
    </tr>
  )
}

const DetailModal: React.FC<{
  selectedDetails: Hit | null
  handleClose: () => void
}> = ({handleClose, selectedDetails}) => (
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
              <strong>{key}:</strong> {JSON.stringify(value)}{" "}              
              <ExternalLink size={16} />
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
)

function parseQuery(search: string): any {
  return qs.parse(search, {
    ignoreQueryPrefix: true,
    allowDots: true,
  })
}

function stringifyQuery(query: any): string {
  return qs.stringify(query, {
    allowDots: true,
    indices: false,
    addQueryPrefix: true,
  })
}

const LogViewer: React.FC<RouteComponentProps> = ({location}) => {
  const params = parseQuery(location.search)
  params.size = 100;

  const [{data, loading, error}, refetch] = useAxios<Array<Hit>>(
    `/api/v1/logs${stringifyQuery(params)}`
  )
  const [form, setForm] = useState<FormState>({size: 100})
  const [selectedDetails, setSelectedDetails] = useState<Hit | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)

  if (error) {
    return <Alert variant="danger">{error.message}</Alert>
  }

  const onRowClicked = (row: Hit) => {
    setSelectedDetails(row)
  }

  const handleSubmit = async (e?: React.ChangeEvent<any>) => {
    e?.preventDefault()

    try {
      await refetch({
        url: `/api/v1/logs${stringifyQuery(form)}`,
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

  const onCheckboxChange = (e: React.ChangeEvent<any>) => {
    const checked = e.target.checked
    setAutoRefresh(checked)
    if (checked) {
      window.setInterval(async () => {
        await refetch({
          url: `/api/v1/logs${stringifyQuery(form)}`,
        })
      }, 5000)
    }
  }

  return (
    <Container fluid>
      <DetailModal
        selectedDetails={selectedDetails}
        handleClose={() => setSelectedDetails(null)}
      />
      <h1 className="mb-3 mt-1">Logs</h1>
      <LogFilter
        autoRefresh={autoRefresh}
        onCheckboxChange={onCheckboxChange}
        handleChange={handleChange}
        handleSubmit={handleSubmit}
        loading={loading}
      />

      <Table size="sm" striped>
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Level</th>
            <th>Service</th>
            <th>Message</th>
          </tr>
        </thead>

        <tbody>
          {data?.map((row) => (
            <TableRow key={row._id} row={row} onRowClicked={onRowClicked} />
          ))}
        </tbody>
      </Table>
    </Container>
  )
}

export default LogViewer
