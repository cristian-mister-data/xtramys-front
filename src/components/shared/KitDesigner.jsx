import { useState, useRef } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { MdColorize } from 'react-icons/md';
import { DEFAULT_KITS, KIT_PATTERNS, normalizeKits } from '@/utils/kits';

// Styled Components
const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: ${({ theme }) => theme.colors.background};
  border-radius: 12px;
  padding: 16px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  min-width: 0;

  @media (max-width: 480px) {
    padding: 12px;
    gap: 12px;
  }
`;

const TabContainer = styled.div`
  display: flex;
  gap: 8px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  padding-bottom: 8px;
  overflow-x: auto;
  min-width: 0;
`;

const Tab = styled.button`
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.2s ease;
  border: 1.5px solid ${({ $active, theme }) => $active ? theme.colors.primary : 'transparent'};
  background: ${({ $active, theme }) => $active ? theme.colors.primarySoft : 'transparent'};
  color: ${({ $active, theme }) => $active ? theme.colors.primary : theme.colors.textSecondary};
  white-space: nowrap;

  @media (max-width: 480px) {
    padding: 7px 10px;
    font-size: 12px;
  }
  
  &:hover {
    background: ${({ $active, theme }) => $active ? theme.colors.primarySoft : theme.colors.backgroundAlt};
  }
`;

const MainGrid = styled.div`
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: 20px;
  @media (max-width: 650px) {
    grid-template-columns: 1fr;
    gap: 12px;
  }
`;

const PreviewPane = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.colors.backgroundAlt};
  border-radius: 10px;
  border: 1.5px dashed ${({ theme }) => theme.colors.border};
  padding: 24px;
  min-height: 200px;

  @media (max-width: 480px) {
    min-height: 150px;
    padding: 14px;
  }
`;

const EditorPane = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const ShapeSelector = styled.div`
  display: flex;
  background: ${({ theme }) => theme.colors.backgroundAlt};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  padding: 3px;
  gap: 3px;
  align-self: flex-start;
  max-width: 100%;
`;

const ShapeOption = styled.button`
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  color: ${({ $active, theme }) => $active ? theme.colors.primary : theme.colors.textSecondary};
  background: ${({ $active, theme }) => $active ? theme.colors.surface : 'transparent'};
  border: 1.5px solid ${({ $active, theme }) => $active ? theme.colors.primary : 'transparent'};
  cursor: pointer;
  transition: all 0.2s ease;

  @media (max-width: 360px) {
    padding: 6px 8px;
  }
`;

const PatternList = styled.div`
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 6px;
  
  &::-webkit-scrollbar {
    height: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.borderStrong};
    border-radius: 3px;
  }
`;

const PatternOption = styled.button`
  width: 54px;
  height: 54px;
  padding: 4px;
  border-radius: 8px;
  border: 2px solid ${({ $active, theme }) => $active ? theme.colors.primary : theme.colors.border};
  background: ${({ $active, theme }) => $active ? theme.colors.primarySoft : theme.colors.surface};
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  
  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

const Subtitle = styled.div`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${({ theme }) => theme.colors.textMuted};
  margin-bottom: 4px;
`;

const ColorRows = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const ColorRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: ${({ theme }) => theme.colors.backgroundAlt};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  padding: 8px 12px;
  gap: 12px;

  @media (max-width: 420px) {
    align-items: flex-start;
    flex-direction: column;
    gap: 7px;
  }
`;

const ColorLabel = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const ColorPickerContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 100%;
`;

const ColorPreviewBox = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1.5px solid rgba(0,0,0,0.15);
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0,0,0,0.06);
`;

const ColorTextInput = styled.input`
  width: 86px;
  height: 28px;
  font-family: monospace;
  font-size: 12px;
  font-weight: 700;
  text-align: center;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 6px;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  text-transform: uppercase;
`;

const ActionIconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  color: ${({ theme }) => theme.colors.textMuted};
  background: transparent;
  border: 1px solid transparent;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ theme }) => theme.colors.background};
    border-color: ${({ theme }) => theme.colors.border};
    color: ${({ theme }) => theme.colors.text};
  }
`;

// Vector shirt SVG component
export const ShirtSvg = ({ pattern, primary, secondary, shape, size = 120 }) => {
  if (shape === 'circle') {
    return (
      <svg viewBox="0 0 100 100" width={size} height={size}>
        <circle cx="50" cy="50" r="42" fill={primary} stroke={secondary} strokeWidth="6" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ overflow: 'visible' }}>
      <defs>
        <mask id={`mask-${pattern}-${primary.replace('#', '')}-${secondary.replace('#', '')}`}>
          <path d="M 50 15 L 28 25 L 14 36 L 24 50 L 32 44 L 32 85 A 3 3 0 0 0 35 88 L 65 88 A 3 3 0 0 0 68 85 L 68 44 L 76 50 L 86 36 L 72 25 Z" fill="white" />
        </mask>
      </defs>
      
      {/* Base Jersey */}
      <path
        d="M 50 15 L 28 25 L 14 36 L 24 50 L 32 44 L 32 85 A 3 3 0 0 0 35 88 L 65 88 A 3 3 0 0 0 68 85 L 68 44 L 76 50 L 86 36 L 72 25 Z"
        fill={primary}
        stroke="rgba(0,0,0,0.18)"
        strokeWidth="1.5"
      />
      
      {/* Pattern elements masked to body */}
      <g mask={`url(#mask-${pattern}-${primary.replace('#', '')}-${secondary.replace('#', '')})`}>
        {pattern === 'vertical' && (
          <>
            <rect x="28" y="0" width="8" height="100" fill={secondary} />
            <rect x="46" y="0" width="8" height="100" fill={secondary} />
            <rect x="64" y="0" width="8" height="100" fill={secondary} />
          </>
        )}
        {pattern === 'horizontal' && (
          <>
            <rect x="0" y="24" width="100" height="8" fill={secondary} />
            <rect x="0" y="44" width="100" height="8" fill={secondary} />
            <rect x="0" y="64" width="100" height="8" fill={secondary} />
          </>
        )}
        {pattern === 'halves' && (
          <rect x="50" y="0" width="50" height="100" fill={secondary} />
        )}
        {pattern === 'diagonal' && (
          <path d="M -20 110 L 120 -30 L 120 0 L -20 140 Z M 10 110 L 150 -30 L 150 0 L 10 140 Z M -50 110 L 90 -30 L 90 0 L -50 140 Z" fill={secondary} />
        )}
        {pattern === 'sash' && (
          <path d="M 0 15 L 100 85 L 100 100 L 0 30 Z" fill={secondary} />
        )}
      </g>
      
      {/* Sleeves accent bands */}
      <path d="M 14 36 L 24 50" stroke={secondary} strokeWidth="2.5" />
      <path d="M 86 36 L 76 50" stroke={secondary} strokeWidth="2.5" />
      
      {/* V-neck collar */}
      <path d="M 40 18 L 50 28 L 60 18" fill="none" stroke={secondary} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
};

// Vector shorts SVG component
export const ShortsSvg = ({ color, size = 120 }) => {
  return (
    <svg viewBox="0 0 100 32" width={size} height={size * 0.32} style={{ overflow: 'visible', marginTop: 4 }}>
      <path
        d="M 33 2 L 67 2 L 72 26 L 52 26 L 50 12 L 48 26 L 28 26 Z"
        fill={color}
        stroke="rgba(0,0,0,0.18)"
        strokeWidth="1.5"
      />
    </svg>
  );
};

// Reusable kit preview for viewing/design lists
export function KitPreview({ kit = DEFAULT_KITS.first, size = 68 }) {
  return (
    <PreviewPane style={{ minHeight: 'auto', padding: 8, background: 'transparent', border: 'none' }}>
      <ShirtSvg pattern={kit.pattern} primary={kit.primaryColor} secondary={kit.secondaryColor} shape={kit.shape} size={size} />
      {kit.shape === 'shirt' && <ShortsSvg color={kit.shortsColor} size={size} />}
    </PreviewPane>
  );
}

// Color picker row helper
function ColorInputRow({ label, value, onChange }) {
  const inputRef = useRef(null);
  const handleOpenPicker = () => {
    inputRef.current?.click();
  };
  const handleTextChange = (e) => {
    let val = e.target.value;
    if (val.length > 7) val = val.substring(0, 7);
    onChange(val);
  };
  return (
    <ColorRow>
      <ColorLabel>{label}</ColorLabel>
      <ColorPickerContainer>
        <ColorPreviewBox style={{ backgroundColor: value }} onClick={handleOpenPicker} />
        <ColorTextInput type="text" value={value} onChange={handleTextChange} placeholder="#FFFFFF" maxLength={7} />
        <ActionIconButton type="button" onClick={handleOpenPicker}>
          <MdColorize size={14} />
        </ActionIconButton>
        <input
          ref={inputRef}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ display: 'none' }}
        />
      </ColorPickerContainer>
    </ColorRow>
  );
}

export default function KitDesigner({ value, onChange }) {
  const { t } = useTranslation();
  const kits = normalizeKits(value);

  const tabKeys = ['first', 'second', 'goalkeeperFirst', 'goalkeeperSecond'];
  const [activeTab, setActiveTab] = useState('first');

  const labels = {
    first: t('kits.first', 'Primera equipación'),
    second: t('kits.second', 'Segunda equipación'),
    goalkeeperFirst: t('kits.goalkeeperFirst', 'Portero · primera'),
    goalkeeperSecond: t('kits.goalkeeperSecond', 'Portero · segunda'),
  };

  const currentKit = kits[activeTab];

  const updateCurrentKit = (patch) => {
    onChange?.({
      ...kits,
      [activeTab]: {
        ...currentKit,
        ...patch,
      },
    });
  };

  return (
    <Container>
      <TabContainer>
        {tabKeys.map((key) => (
          <Tab
            key={key}
            type="button"
            $active={activeTab === key}
            onClick={() => setActiveTab(key)}
          >
            {labels[key]}
          </Tab>
        ))}
      </TabContainer>

      <MainGrid>
        <PreviewPane>
          <ShirtSvg
            pattern={currentKit.pattern}
            primary={currentKit.primaryColor}
            secondary={currentKit.secondaryColor}
            shape={currentKit.shape}
            size={90}
          />
          {currentKit.shape === 'shirt' && (
            <ShortsSvg color={currentKit.shortsColor} size={90} />
          )}
        </PreviewPane>

        <EditorPane>
          <div>
            <Subtitle>{t('kits.shape', 'Tipo de ficha')}</Subtitle>
            <ShapeSelector>
              <ShapeOption
                type="button"
                $active={currentKit.shape === 'shirt'}
                onClick={() => updateCurrentKit({ shape: 'shirt' })}
              >
                {t('kits.shirt', 'Camiseta')}
              </ShapeOption>
              <ShapeOption
                type="button"
                $active={currentKit.shape === 'circle'}
                onClick={() => updateCurrentKit({ shape: 'circle' })}
              >
                {t('kits.circle', 'Círculo')}
              </ShapeOption>
            </ShapeSelector>
          </div>

          {currentKit.shape === 'shirt' && (
            <div>
              <Subtitle>{t('kits.pattern', 'Diseño de Camiseta')}</Subtitle>
              <PatternList>
                {KIT_PATTERNS.map((pattern) => (
                  <PatternOption
                    key={pattern}
                    type="button"
                    $active={currentKit.pattern === pattern}
                    onClick={() => updateCurrentKit({ pattern })}
                  >
                    <ShirtSvg
                      pattern={pattern}
                      primary="#2563eb"
                      secondary="#ffffff"
                      shape="shirt"
                      size={32}
                    />
                  </PatternOption>
                ))}
              </PatternList>
            </div>
          )}

          <ColorRows>
            <Subtitle>{t('kits.colors', 'Colores')}</Subtitle>
            <ColorInputRow
              label={currentKit.shape === 'circle' ? t('kits.fillColor', 'Color de fondo') : t('kits.primary', 'Principal')}
              value={currentKit.primaryColor}
              onChange={(primaryColor) => updateCurrentKit({ primaryColor })}
            />
            <ColorInputRow
              label={currentKit.shape === 'circle' ? t('kits.borderColor', 'Color del borde') : t('kits.secondary', 'Secundario')}
              value={currentKit.secondaryColor}
              onChange={(secondaryColor) => updateCurrentKit({ secondaryColor })}
            />
            {currentKit.shape === 'shirt' && (
              <ColorInputRow
                label={t('kits.shorts', 'Pantalón')}
                value={currentKit.shortsColor}
                onChange={(shortsColor) => updateCurrentKit({ shortsColor })}
              />
            )}
          </ColorRows>
        </EditorPane>
      </MainGrid>
    </Container>
  );
}
