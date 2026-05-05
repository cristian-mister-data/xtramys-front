import styled from 'styled-components';

const HeaderShell = styled.section`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  width: 100%;
  padding: 18px 20px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: ${({ theme }) => theme.shadows.sm};
  color: ${({ theme }) => theme.colors.text};

  @media (max-width: 720px) {
    align-items: stretch;
    flex-direction: column;
    padding: 16px;
  }
`;

const Identity = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;

  @media (max-width: 720px) {
    align-items: flex-start;
  }
`;

const IconBox = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 42px;
  height: 42px;
  border-radius: 8px;
  background: ${({ theme }) => theme.colors.primarySoft};
  color: ${({ theme }) => theme.colors.primarySoftText};
`;

const Copy = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`;

const Eyebrow = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 12px;
  font-weight: 700;
  line-height: 1.25;
`;

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex-wrap: wrap;
`;

const Title = styled.h1`
  margin: 0;
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: 24px;
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: 0;

  @media (max-width: 720px) {
    font-size: 21px;
  }
`;

const Subtitle = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textSecondary};
  font-size: 13px;
  line-height: 1.45;
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;

  @media (max-width: 720px) {
    justify-content: flex-start;
    width: 100%;

    > * {
      width: 100%;
      min-width: 0;
    }

    button,
    a {
      flex: 1 1 auto;
      min-width: 0;
    }
  }
`;

export default function SectionHeader({
  title,
  subtitle,
  eyebrow,
  icon: Icon,
  actions,
  meta,
}) {
  return (
    <HeaderShell>
      <Identity>
        {Icon ? (
          <IconBox aria-hidden="true">
            <Icon size={24} />
          </IconBox>
        ) : null}
        <Copy>
          {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
          <TitleRow>
            <Title>{title}</Title>
            {meta ? meta : null}
          </TitleRow>
          {subtitle ? <Subtitle>{subtitle}</Subtitle> : null}
        </Copy>
      </Identity>
      {actions ? <Actions>{actions}</Actions> : null}
    </HeaderShell>
  );
}
