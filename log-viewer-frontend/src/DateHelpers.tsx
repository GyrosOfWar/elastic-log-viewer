import React from "react"
import {formatDistanceToNow, lightFormat, parseISO} from "date-fns"

interface Props {
  timestamp: string
  withTime?: boolean
}

export const RelativeDate: React.FC<Props> = ({timestamp}) => {
  return (
    <>
      <time dateTime={timestamp} title={timestamp}>
        {formatDistanceToNow(parseISO(timestamp))}
      </time>{" "}
      ago
    </>
  )
}

export const AbsoluteDate: React.FC<Props> = ({
  timestamp,
  withTime = false,
}) => (
  <time dateTime={timestamp} title={timestamp}>
    {lightFormat(
      parseISO(timestamp),
      withTime ? "dd.MM.yyyy hh:mm" : "dd.MM.yyyy"
    )}
  </time>
)

export const AbsoluteDateTime: React.FC<Props> = ({timestamp}) => (
  <time dateTime={timestamp}>
    {lightFormat(parseISO(timestamp), "dd.MM.yyyy HH:mm")}
  </time>
)
