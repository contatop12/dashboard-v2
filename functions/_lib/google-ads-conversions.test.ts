import { describe, expect, it } from 'vitest'
import {
  buildConversionResourceName,
  extractConversionActionId,
  parseConversionActionFields,
  readConversionActionResourceName,
} from './google-ads-conversions'

describe('google-ads-conversions', () => {
  it('extrai id de resource name completo', () => {
    expect(extractConversionActionId('customers/2539063374/conversionActions/6926623587')).toBe('6926623587')
  })

  it('aceita id numérico puro', () => {
    expect(extractConversionActionId('6926623587')).toBe('6926623587')
  })

  it('lê resource name em segments como string', () => {
    expect(
      readConversionActionResourceName({
        conversionAction: 'customers/2539063374/conversionActions/6926623587',
      })
    ).toBe('customers/2539063374/conversionActions/6926623587')
  })

  it('lê resource name em segments como objeto', () => {
    expect(
      readConversionActionResourceName({
        conversion_action: { resource_name: 'customers/1/conversionActions/99' },
      })
    ).toBe('customers/1/conversionActions/99')
  })

  it('parseia nome da conversion_action na linha', () => {
    expect(
      parseConversionActionFields({
        conversionAction: {
          resourceName: 'customers/1/conversionActions/99',
          name: 'Lead — Formulário',
          primaryForGoal: true,
        },
      })
    ).toEqual({
      resourceName: 'customers/1/conversionActions/99',
      name: 'Lead — Formulário',
      primaryForGoal: true,
    })
  })

  it('monta resource name a partir do customer e id', () => {
    expect(buildConversionResourceName('2539063374', '6926623587')).toBe(
      'customers/2539063374/conversionActions/6926623587'
    )
  })
})
