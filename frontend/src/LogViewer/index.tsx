import React, {useState, useEffect} from "react"
import {Table, Container, Alert, Button, Modal} from "react-bootstrap"
import {RouteComponentProps, Link} from "react-router-dom"
import {ExternalLink} from "react-feather"
import qs from "qs"
import axios from "axios"

import {AbsoluteDateTime} from "../DateHelpers"
import LogFilter from "./LogFilter"
import {
  Hit,
  LogLine,
  FormState,
  FormControlElement,
  logLineMapping,
} from "./types"
import "./index.css"

const TableRow: React.FC<{row: Hit; onRowClicked: (row: Hit) => void}> = ({
  row,
  onRowClicked,
}) => {
  const data: LogLine = row._source
  const message = row.highlight?.message[0] || data.message

  return (
    <tr onClick={() => onRowClicked(row)}>
      <td>{<AbsoluteDateTime timestamp={data.timestamp} />}</td>
      <td>{data.logLevel}</td>
      <td>{data.serviceName}</td>
      <td dangerouslySetInnerHTML={{__html: message}} />
    </tr>
  )
}

function convertKey(key: string): string {
  return logLineMapping[key] || key
}

const KeyValueEntry: React.FC<{keyName: string; value: any}> = ({
  keyName,
  value,
}) => {
  const params = {
    query: `${convertKey(keyName)}: "${value}"`,
  }
  return (
    <li>
      <strong>{keyName}:</strong> {JSON.stringify(value)}{" "}
      <Link
        to={{
          search: stringifyQuery(params),
        }}
      >
        <ExternalLink size={16} />
      </Link>
    </li>
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
            <KeyValueEntry key={key} keyName={key} value={value} />
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

interface State {
  loading: boolean
  data?: Array<Hit>
  error?: any
}

const LogViewer: React.FC<RouteComponentProps> = ({location, history}) => {
  const params = parseQuery(location.search)
  params.size = 100

  const [{data, loading, error}, setData] = useState<State>({loading: true})
  const [form, setForm] = useState<FormState>(params)
  const [selectedDetails, setSelectedDetails] = useState<Hit | null>(null)

  async function fetchLogs(filter: FormState) {
    const params = stringifyQuery(filter)
    try {
      const response = await axios.get(`/api/v1/logs${params}`)
      setData({
        error: undefined,
        loading: false,
        data: response.data,
      })
    } catch (err) {
      setData({error: err, loading: false})
    }
  }

  useEffect(() => {
    const query = parseQuery(location.search)
    query.size = 100

    fetchLogs(query).catch(console.error)
  }, [location.search])

  if (error) {
    return <Alert variant="danger">{error.message}</Alert>
  }

  const onRowClicked = (row: Hit) => {
    setSelectedDetails(row)
  }

  // FIXME why does this not set the correct form state?
  const handleSubmit = async (e?: React.ChangeEvent<any>) => {
    e?.preventDefault()
    history.push({
      search: stringifyQuery(form),
    })
    setForm(form)
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
    setForm((oldForm) => {
      return {
        ...oldForm,
        autoRefresh: checked,
      }
    })
    if (checked) {
      // window.setInterval(async () => {
      //   await refetch({
      //     url: `/api/v1/logs${stringifyQuery(form)}`,
      //   })
      // }, 5000)
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
        onCheckboxChange={onCheckboxChange}
        handleChange={handleChange}
        handleSubmit={handleSubmit}
        loading={loading}
        state={form}
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
