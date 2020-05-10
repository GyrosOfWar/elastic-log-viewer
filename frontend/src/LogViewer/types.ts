export type FormControlElement =
  | HTMLInputElement
  | HTMLSelectElement
  | HTMLTextAreaElement

export interface FormState {
  query?: string
  startDate?: string
  endDate?: string
  size?: number
}

// TODO create a mapping from those properties to elastic properties
export interface LogLine {
  timestamp: string
  eventDataset: string
  logLevel: string
  logLogger: string
  message: string
  serviceName: string
  [key: string]: any
}

export const logLineMapping: any = {
    timestamp: '@timestamp',
    eventDataset: 'event.dataset',
    logLevel: 'log.level',
    logLogger: 'log.logger',
    serviceName: 'service.name'
}

export interface Hit {
  _source: any
  _id: string
  sort?: Array<LogLine>
}
