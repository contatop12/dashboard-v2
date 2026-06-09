import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BlockCard } from './BlockCard'

describe('BlockCard', () => {
  it('renders title, info trigger, actions, and children when ready', () => {
    render(
      <BlockCard title="Campanhas" infoKey="ctrLink" actions={<button>Sort</button>}>
        <p>conteudo</p>
      </BlockCard>
    )
    expect(screen.getByText('Campanhas')).toBeInTheDocument()
    expect(screen.getByLabelText(/CTR no link/i)).toBeInTheDocument()
    expect(screen.getByText('Sort')).toBeInTheDocument()
    expect(screen.getByText('conteudo')).toBeInTheDocument()
  })

  it('renders BlockState instead of children when state is empty', () => {
    render(
      <BlockCard title="Campanhas" state="empty" emptyMessage="Nada aqui">
        <p>conteudo</p>
      </BlockCard>
    )
    expect(screen.queryByText('conteudo')).not.toBeInTheDocument()
    expect(screen.getByText('Nada aqui')).toBeInTheDocument()
  })
})
