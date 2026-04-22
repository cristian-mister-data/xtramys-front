import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import * as wellnessApi from '@/api/wellness';
import { Card, Title, Subtitle, Field, Label, Input, Button, Stack, ErrorText, Muted } from '@/ui/primitives';

export function PublicForm({ mode = 'post' }) {
  const { token } = useParams();
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [answers, setAnswers] = useState({});
  const [name, setName] = useState('');

  const getForm = mode === 'pre' ? wellnessApi.getPreWellnessFormDataPublic : wellnessApi.getWellnessFormDataPublic;
  const submit = mode === 'pre' ? wellnessApi.submitPreWellnessPublic : wellnessApi.submitWellnessPublic;

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await getForm(token);
        if (mounted) setMeta(res?.data || res);
      } catch (err) {
        if (mounted) setError(err?.message || 'No se pudo cargar el formulario');
      }
    })();
    return () => { mounted = false; };
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await submit(token, { jugador: name, answers });
      setSubmitted(true);
    } catch (err) { setError(err?.message || 'Error enviando'); }
    finally { setSubmitting(false); }
  };

  if (error) return (
    <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <Card><Title>Error</Title><Subtitle>{error}</Subtitle></Card>
    </div>
  );

  if (submitted) return (
    <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <Card><Title>¡Gracias!</Title><Subtitle>Tu respuesta ha sido enviada.</Subtitle></Card>
    </div>
  );

  if (!meta) return (
    <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <Card><Muted>Cargando…</Muted></Card>
    </div>
  );

  const questions = meta?.questions || meta?.preguntas || [];

  return (
    <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24 }}>
      <Card style={{ width: '100%', maxWidth: 560 }}>
        <Title>{meta?.title || (mode === 'pre' ? 'Pre-Wellness' : 'Wellness')}</Title>
        <Subtitle>{meta?.description || ''}</Subtitle>
        <form onSubmit={onSubmit}>
          <Stack $gap={12}>
            <Field>
              <Label>Tu nombre</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </Field>
            {questions.map((q, idx) => {
              const key = q._id || q.id || `q${idx}`;
              return (
                <Field key={key}>
                  <Label>{q.text || q.pregunta}</Label>
                  <Input
                    type="number" min="1" max="10"
                    value={answers[key] || ''}
                    onChange={(e) => setAnswers((a) => ({ ...a, [key]: e.target.value }))}
                  />
                </Field>
              );
            })}
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Enviando…' : 'Enviar'}
            </Button>
            {error && <ErrorText>{error}</ErrorText>}
          </Stack>
        </form>
      </Card>
    </div>
  );
}

export default function WellnessForm() {
  return <PublicForm mode="post" />;
}
