import React from "react"
import useAxios from "axios-hooks"
import {Table, Container, Spinner} from "react-bootstrap"

const App = () => {
  const [{data, loading, error}] = useAxios<Array<any>>(
    "/api/v1/logs?size=100"
  )

  return (
    <Container fluid>
      <h1>Logs</h1>

      {loading && (
        <Spinner animation="border" role="status">
          <span className="sr-only">Loading...</span>
        </Spinner>
      )}
      <Table size="sm">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Message</th>
          </tr>
        </thead>

        <tbody>
          {data?.map((row) => (
            <tr>
              <td>{row["@timestamp"]}</td>
              <td>{row.message}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Container>
  )
}

export default App
