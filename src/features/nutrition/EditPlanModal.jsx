// Modal de edición de plan personalizado de nutrición.
// Equivalente web del EditPlanModal RN — usa textareas/inputs para todas las
// secciones (preseason, season, reference) con add/remove sobre los arrays.
import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { MdAdd, MdDelete, MdSave, MdClose } from 'react-icons/md';
import Modal from '../../ui/Modal';
import { Button, Input, TextArea, Stack, Row, Label, Muted } from '../../ui/primitives';
import { updateNutritionPlan } from '../../api/nutritionMethodology';
import { toast } from '../../ui/toast';
import { confirmAction } from '../../ui/confirm';

const TabBar = styled.div`
  display: flex;
  gap: 6px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  margin-bottom: 14px;
`;
const TabBtn = styled.button`
  padding: 10px 14px;
  border: none;
  background: ${({ $active, theme }) => ($active ? theme.colors.primary : 'transparent')};
  color: ${({ $active, theme }) => ($active ? '#fff' : theme.colors.text)};
  border-radius: ${({ theme }) => theme.radius.md} ${({ theme }) => theme.radius.md} 0 0;
  cursor: pointer;
  font-weight: 600;
  font-size: 13px;
`;

const Section = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 12px;
  margin-bottom: 12px;
  background: ${({ theme }) => theme.colors.background};
`;

const SectionTitle = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 700;
  margin-bottom: 10px;
  font-size: 14px;
`;

const ItemRow = styled.div`
  display: flex;
  gap: 8px;
  align-items: flex-start;
  margin-bottom: 8px;
`;

const IconBtn = styled.button`
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: #fff;
  border-radius: ${({ theme }) => theme.radius.sm};
  padding: 6px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${({ $danger, theme }) => ($danger ? theme.colors.error : theme.colors.text)};

  &:hover { background: ${({ theme }) => theme.colors.backgroundAlt}; }
`;

const SmallButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.colors.primary}15;
  color: ${({ theme }) => theme.colors.primary};
  border: 1px dashed ${({ theme }) => theme.colors.primary}55;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  &:hover { background: ${({ theme }) => theme.colors.primary}25; }
`;

const SECTIONS = ['preseason', 'season', 'reference'];

export default function EditPlanModal({ open, onClose, plan, onSaved }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState('preseason');
  const [editData, setEditData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');

  useEffect(() => {
    if (open && plan) {
      setEditData(JSON.parse(JSON.stringify(plan)));
      setName(plan.name || '');
      setTab('preseason');
    }
  }, [open, plan]);

  if (!editData) return null;

  // ---- mutators ----
  const set = (mutator) => {
    setEditData((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      mutator(next);
      return next;
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = { ...editData, name };
      const { data } = await updateNutritionPlan(plan._id, payload);
      onSaved?.(data);
      toast.success(t('nutrition.alerts.planSaved', 'Plan guardado'));
      onClose();
    } catch (e) {
      console.error(e);
      toast.error(t('nutrition.alerts.couldNotSave', 'No se pudo guardar'));
    } finally {
      setSaving(false);
    }
  };

  // ---- helpers de render por tab ----
  const renderMealsEditor = (sectionKey) => {
    const meals = editData[sectionKey]?.meals || {};
    const labels = {
      breakfast: `🍳 ${t('nutrition.meals.breakfasts', 'Desayunos')}`,
      mid_morning: `🥤 ${t('nutrition.meals.midMorning', 'Media mañana')}`,
      snacks: `🍎 ${t('nutrition.meals.snacks', 'Snacks')}`,
    };
    return ['breakfast', 'mid_morning', 'snacks'].map((mealKey) => {
      const list = meals[mealKey] || [];
      const isBreakfast = mealKey === 'breakfast';
      return (
        <Section key={mealKey}>
          <SectionTitle>
            <span>{labels[mealKey]}</span>
            <SmallButton
              onClick={() =>
                set((d) => {
                  d[sectionKey].meals[mealKey].push(
                    isBreakfast
                      ? { type: t('nutrition.newElements.newType', 'Nuevo tipo'), items: [''] }
                      : { condition: t('nutrition.newElements.newCondition', 'Nueva condición'), options: [''] }
                  );
                })
              }
            >
              <MdAdd size={14} /> {t('nutrition.edit.add', 'Añadir')}
            </SmallButton>
          </SectionTitle>

          {list.map((cat, ci) => {
            const listKey = isBreakfast ? 'items' : 'options';
            const labelKey = isBreakfast ? 'type' : 'condition';
            return (
              <Section key={ci} style={{ background: '#fff' }}>
                <ItemRow>
                  <Input
                    style={{ flex: 1 }}
                    value={cat[labelKey] || ''}
                    onChange={(e) =>
                      set((d) => {
                        d[sectionKey].meals[mealKey][ci][labelKey] = e.target.value;
                      })
                    }
                    placeholder={t('nutrition.edit.categoryName', 'Nombre')}
                  />
                  <IconBtn
                    $danger
                    title={t('nutrition.edit.remove', 'Eliminar')}
                    onClick={async () => {
                      const ok = await confirmAction(
                        t('nutrition.alerts.deleteCategoryConfirm', '¿Eliminar categoría?')
                      );
                      if (!ok) return;
                      set((d) => {
                        d[sectionKey].meals[mealKey].splice(ci, 1);
                      });
                    }}
                  >
                    <MdDelete size={16} />
                  </IconBtn>
                </ItemRow>
                {(cat[listKey] || []).map((item, ii) => (
                  <ItemRow key={ii}>
                    <TextArea
                      style={{ flex: 1, minHeight: 50 }}
                      value={item}
                      onChange={(e) =>
                        set((d) => {
                          d[sectionKey].meals[mealKey][ci][listKey][ii] = e.target.value;
                        })
                      }
                    />
                    <IconBtn
                      $danger
                      onClick={() =>
                        set((d) => {
                          d[sectionKey].meals[mealKey][ci][listKey].splice(ii, 1);
                        })
                      }
                    >
                      <MdDelete size={16} />
                    </IconBtn>
                  </ItemRow>
                ))}
                <SmallButton
                  onClick={() =>
                    set((d) => {
                      d[sectionKey].meals[mealKey][ci][listKey].push('');
                    })
                  }
                >
                  <MdAdd size={14} /> {t('nutrition.edit.addItem', 'Añadir elemento')}
                </SmallButton>
              </Section>
            );
          })}
        </Section>
      );
    });
  };

  const renderPreseason = () => (
    <>
      <Section>
        <Label>{t('nutrition.edit.title', 'Título')}</Label>
        <Input
          value={editData.preseason?.title || ''}
          onChange={(e) =>
            set((d) => {
              d.preseason.title = e.target.value;
            })
          }
        />
      </Section>

      {renderMealsEditor('preseason')}

      <Section>
        <SectionTitle>{t('nutrition.sections.weeklyMenu', 'Menú semanal')}</SectionTitle>
        {(editData.preseason?.weekly_menu || []).map((day, i) => (
          <div key={i} style={{ marginBottom: 12, padding: 10, background: '#fff', borderRadius: 8 }}>
            <Row $gap={8}>
              <Input
                style={{ flex: 1 }}
                value={day.day || ''}
                onChange={(e) =>
                  set((d) => {
                    d.preseason.weekly_menu[i].day = e.target.value;
                  })
                }
                placeholder="Día"
              />
              <Input
                style={{ flex: 1 }}
                value={day.tag || ''}
                onChange={(e) =>
                  set((d) => {
                    d.preseason.weekly_menu[i].tag = e.target.value;
                  })
                }
                placeholder="Tag"
              />
            </Row>
            <TextArea
              style={{ marginTop: 6 }}
              value={day.lunch || ''}
              onChange={(e) =>
                set((d) => {
                  d.preseason.weekly_menu[i].lunch = e.target.value;
                })
              }
              placeholder={t('nutrition.meals.lunch')}
            />
            <TextArea
              style={{ marginTop: 6 }}
              value={day.dinner || ''}
              onChange={(e) =>
                set((d) => {
                  d.preseason.weekly_menu[i].dinner = e.target.value;
                })
              }
              placeholder={t('nutrition.meals.dinner')}
            />
          </div>
        ))}
      </Section>
    </>
  );

  const renderSeason = () => (
    <>
      <Section>
        <Label>{t('nutrition.edit.title', 'Título')}</Label>
        <Input
          value={editData.season?.title || ''}
          onChange={(e) =>
            set((d) => {
              d.season.title = e.target.value;
            })
          }
        />
      </Section>

      {renderMealsEditor('season')}

      <Section>
        <SectionTitle>{t('nutrition.sections.contextMenus', 'Menús por contexto')}</SectionTitle>
        {(editData.season?.menu_options || []).map((ctx, ci) => (
          <Section key={ci} style={{ background: '#fff' }}>
            <ItemRow>
              <Input
                style={{ flex: 1 }}
                value={ctx.context || ''}
                onChange={(e) =>
                  set((d) => {
                    d.season.menu_options[ci].context = e.target.value;
                  })
                }
                placeholder={t('nutrition.edit.context', 'Contexto')}
              />
            </ItemRow>
            <Label>{t('nutrition.meals.lunch', 'Comidas')}</Label>
            {(ctx.lunches || []).map((l, li) => (
              <ItemRow key={`l${li}`}>
                <TextArea
                  style={{ flex: 1, minHeight: 50 }}
                  value={l}
                  onChange={(e) =>
                    set((d) => {
                      d.season.menu_options[ci].lunches[li] = e.target.value;
                    })
                  }
                />
                <IconBtn
                  $danger
                  onClick={() =>
                    set((d) => {
                      d.season.menu_options[ci].lunches.splice(li, 1);
                    })
                  }
                >
                  <MdDelete size={16} />
                </IconBtn>
              </ItemRow>
            ))}
            <SmallButton
              onClick={() =>
                set((d) => {
                  d.season.menu_options[ci].lunches.push('');
                })
              }
            >
              <MdAdd size={14} /> {t('nutrition.edit.addLunch', 'Añadir comida')}
            </SmallButton>

            <Label style={{ marginTop: 10 }}>{t('nutrition.meals.dinner', 'Cenas')}</Label>
            {(ctx.dinners || []).map((dn, di) => (
              <ItemRow key={`d${di}`}>
                <TextArea
                  style={{ flex: 1, minHeight: 50 }}
                  value={dn}
                  onChange={(e) =>
                    set((d) => {
                      d.season.menu_options[ci].dinners[di] = e.target.value;
                    })
                  }
                />
                <IconBtn
                  $danger
                  onClick={() =>
                    set((d) => {
                      d.season.menu_options[ci].dinners.splice(di, 1);
                    })
                  }
                >
                  <MdDelete size={16} />
                </IconBtn>
              </ItemRow>
            ))}
            <SmallButton
              onClick={() =>
                set((d) => {
                  d.season.menu_options[ci].dinners.push('');
                })
              }
            >
              <MdAdd size={14} /> {t('nutrition.edit.addDinner', 'Añadir cena')}
            </SmallButton>
          </Section>
        ))}
      </Section>
    </>
  );

  const renderReference = () => {
    const ref = editData.reference || {};
    const renderQuantityList = (type) => (
      <Section>
        <SectionTitle>
          <span>{t(`nutrition.reference.${type}`, type)}</span>
          <SmallButton
            onClick={() =>
              set((d) => {
                d.reference.quantities_gr[type].push({ name: '', lunch: 0, dinner: 0 });
              })
            }
          >
            <MdAdd size={14} /> {t('nutrition.edit.add', 'Añadir')}
          </SmallButton>
        </SectionTitle>
        {(ref.quantities_gr?.[type] || []).map((item, i) => (
          <ItemRow key={i}>
            <Input
              style={{ flex: 2 }}
              value={item.name || ''}
              onChange={(e) =>
                set((d) => {
                  d.reference.quantities_gr[type][i].name = e.target.value;
                })
              }
              placeholder={t('nutrition.reference.food')}
            />
            <Input
              type="number"
              style={{ width: 80 }}
              value={item.lunch ?? 0}
              onChange={(e) =>
                set((d) => {
                  d.reference.quantities_gr[type][i].lunch = Number(e.target.value);
                })
              }
            />
            <Input
              type="number"
              style={{ width: 80 }}
              value={item.dinner ?? 0}
              onChange={(e) =>
                set((d) => {
                  d.reference.quantities_gr[type][i].dinner = Number(e.target.value);
                })
              }
            />
            <IconBtn
              $danger
              onClick={() =>
                set((d) => {
                  d.reference.quantities_gr[type].splice(i, 1);
                })
              }
            >
              <MdDelete size={16} />
            </IconBtn>
          </ItemRow>
        ))}
      </Section>
    );

    return (
      <>
        {renderQuantityList('carbohydrates')}
        {renderQuantityList('proteins')}

        <Section>
          <SectionTitle>
            <span>{t('nutrition.sections.supplements', 'Suplementos')}</span>
            <SmallButton
              onClick={() =>
                set((d) => {
                  d.reference.supplements.push({ name: '', description: '', icon: 'medication' });
                })
              }
            >
              <MdAdd size={14} /> {t('nutrition.edit.add', 'Añadir')}
            </SmallButton>
          </SectionTitle>
          {(ref.supplements || []).map((s, i) => (
            <Section key={i} style={{ background: '#fff' }}>
              <Input
                value={s.name || ''}
                onChange={(e) =>
                  set((d) => {
                    d.reference.supplements[i].name = e.target.value;
                  })
                }
                placeholder={t('nutrition.edit.name', 'Nombre')}
              />
              <TextArea
                style={{ marginTop: 6 }}
                value={s.description || ''}
                onChange={(e) =>
                  set((d) => {
                    d.reference.supplements[i].description = e.target.value;
                  })
                }
                placeholder={t('nutrition.edit.description', 'Descripción')}
              />
              <Row style={{ marginTop: 6 }}>
                <IconBtn
                  $danger
                  onClick={() =>
                    set((d) => {
                      d.reference.supplements.splice(i, 1);
                    })
                  }
                >
                  <MdDelete size={16} />
                </IconBtn>
              </Row>
            </Section>
          ))}
        </Section>

        <Section>
          <SectionTitle>
            <span>{t('nutrition.sections.hydration', 'Hidratación')}</span>
            <SmallButton
              onClick={() =>
                set((d) => {
                  d.reference.hydration_tips.push('');
                })
              }
            >
              <MdAdd size={14} /> {t('nutrition.edit.add', 'Añadir')}
            </SmallButton>
          </SectionTitle>
          {(ref.hydration_tips || []).map((tip, i) => (
            <ItemRow key={i}>
              <TextArea
                style={{ flex: 1, minHeight: 50 }}
                value={tip}
                onChange={(e) =>
                  set((d) => {
                    d.reference.hydration_tips[i] = e.target.value;
                  })
                }
              />
              <IconBtn
                $danger
                onClick={() =>
                  set((d) => {
                    d.reference.hydration_tips.splice(i, 1);
                  })
                }
              >
                <MdDelete size={16} />
              </IconBtn>
            </ItemRow>
          ))}
        </Section>
      </>
    );
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('nutrition.edit.title', 'Editar plan')}
      width={900}
      footer={
        <Row $gap={8}>
          <Button $variant="secondary" onClick={onClose} disabled={saving}>
            <MdClose size={16} style={{ verticalAlign: 'middle' }} /> {t('common.cancel', 'Cancelar')}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <MdSave size={16} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            {saving ? t('common.saving', 'Guardando…') : t('common.save', 'Guardar')}
          </Button>
        </Row>
      }
    >
      <Stack $gap={12}>
        <div>
          <Label>{t('nutrition.edit.planName', 'Nombre del plan')}</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <TabBar>
          {SECTIONS.map((s) => (
            <TabBtn key={s} $active={tab === s} onClick={() => setTab(s)}>
              {t(`nutrition.tabs.${s}`, s)}
            </TabBtn>
          ))}
        </TabBar>

        {tab === 'preseason' && renderPreseason()}
        {tab === 'season' && renderSeason()}
        {tab === 'reference' && renderReference()}

        <Muted>{t('nutrition.edit.hint', 'Los cambios se guardan al pulsar “Guardar”.')}</Muted>
      </Stack>
    </Modal>
  );
}
