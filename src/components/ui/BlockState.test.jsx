import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BlockState } from './BlockState'

describe('BlockState', () => {
  it('renders a skeleton in loading state', () => {
    render(<BlockState state="loading" />)
    expect(screen.getByTestId('block-skeleton')).toBeInTheDocument()
  })
  it('renders the empty message', () => {
    render(<BlockState state="empty" message="Nenhuma campanha no período" />)
    expect(screen.getByText('Nenhuma campanha no período')).toBeInTheDocument()
  })
  it('renders the error message in alert role', () => {
    render(<BlockState state="error" message="Token inválido" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Token inválido')
  })
})
