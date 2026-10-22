import { workflow, node, trigger, expr } from '@n8n/workflow-sdk'

// Flujo: Lee meteorología de Open-Meteo cada hora para Los Lagos y la expone por webhook GET
// Arquetipo: webhook GET + schedule que actualiza caché en Set

const webhookTrigger = trigger({
  type: 'n8n-nodes-base.webhook',
  version: 2.1,
  config: {
    name: 'GET /meteo-loslagos',
    parameters: {
      httpMethod: 'GET',
      path: 'meteo-loslagos',
      responseMode: 'responseNode',
      options: {
        allowedOrigins: '*'
      }
    }
  }
})

const fetchMeteo = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Fetch Open-Meteo',
    retryOnFail: true,
    maxTries: 3,
    waitBetweenTries: 5000,
    parameters: {
      method: 'GET',
      url: 'https://api.open-meteo.com/v1/forecast',
      sendQuery: true,
      specifyQuery: 'keypair',
      queryParameters: {
        parameters: [
          { name: 'latitude', value: '-41.47' },
          { name: 'longitude', value: '-72.94' },
          { name: 'hourly', value: 'temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m' },
          { name: 'timezone', value: 'America/Santiago' },
          { name: 'forecast_days', value: '3' }
        ]
      }
    }
  }
})

const setResponse = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Preparar Respuesta',
    parameters: {
      mode: 'raw',
      jsonOutput: expr('{{ { "fuente": "open-meteo", "lat": -41.47, "lon": -72.94, "zona": "Los Lagos Chile", "generado": $now.toISO(), "datos": $json } }}')
    }
  }
})

const respondWebhook = node({
  type: 'n8n-nodes-base.respondToWebhook',
  version: 1.5,
  config: {
    name: 'Responder JSON',
    parameters: {
      respondWith: 'firstIncomingItem',
      options: {
        responseCode: 200,
        responseHeaders: {
          entries: [
            { name: 'Content-Type', value: 'application/json' },
            { name: 'Cache-Control', value: 'public, max-age=3600' }
          ]
        }
      }
    }
  }
})

const scheduleTrigger = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.4,
  config: {
    name: 'Cada Hora',
    parameters: {
      rule: {
        interval: [
          { field: 'hours', hoursInterval: 1, triggerAtMinute: 5 }
        ]
      }
    }
  }
})

const logUpdate = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Log Actualizacion',
    parameters: {
      mode: 'manual',
      assignments: {
        assignments: [
          { id: 'ts', name: 'actualizadoEn', value: expr('{{ $now.toISO() }}'), type: 'string' },
          { id: 'ok', name: 'estado', value: 'ok', type: 'string' }
        ]
      }
    }
  }
})

export default workflow('meteo-loslagos', 'Meteorologia Los Lagos - Open-Meteo')
  .add(webhookTrigger)
  .to(fetchMeteo)
  .to(setResponse)
  .to(respondWebhook)
  .add(scheduleTrigger)
  .to(fetchMeteo)
  .to(logUpdate)
