// Stub genérico reutilizable para páginas pendientes de migrar.
import styled from 'styled-components';
import { Card, PageHeader, PageTitle, Muted } from './primitives';

const Body = styled.div`
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 14px;
  line-height: 1.6;
`;

export default function Stub({ title, sourcePath, description }) {
  return (
    <div>
      <PageHeader>
        <PageTitle>{title}</PageTitle>
      </PageHeader>
      <Card>
        <Body>
          {description && <p>{description}</p>}
          <p><Muted>TODO: portar desde <code>{sourcePath}</code></Muted></p>
        </Body>
      </Card>
    </div>
  );
}
