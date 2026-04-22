import { Link } from 'react-router-dom';
import { Card, Title, Subtitle, Button } from '@/ui/primitives';

export default function NotFound() {
  return (
    <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <Card>
        <Title>404</Title>
        <Subtitle>Página no encontrada</Subtitle>
        <Link to="/"><Button>Inicio</Button></Link>
      </Card>
    </div>
  );
}
