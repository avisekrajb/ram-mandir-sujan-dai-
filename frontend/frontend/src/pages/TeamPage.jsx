// pages/TeamPage.jsx - Updated with Founder/Patron hero section (no icons, no view profile button)
import React, { useState, useEffect } from 'react';
import SubTitle from '../components/common/SubTitle';
import { useLanguage } from '../context/LanguageContext';
import api from '../services/api';
import OmLoader from '../components/common/OmLoader';
import PageHeader from '../components/common/PageHeader';

const TeamPage = () => {
  const { t, lang } = useLanguage();
  const [team, setTeam] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const roleHierarchy = {
    founder: { 
      label: { en: 'Founder / Patron', ne: 'संस्थापक / संरक्षक', hi: 'संस्थापक / संरक्षक', zh: '创始人 / 赞助人', ta: 'நிறுவனர் / புரவலர்' },
      order: 0,
      isFounder: true
    },
    president: { 
      label: { en: 'President / Chairperson', ne: 'अध्यक्ष', hi: 'अध्यक्ष', zh: '主席', ta: 'தலைவர்' },
      order: 1
    },
    vicePresident: { 
      label: { en: 'Vice President', ne: 'उपाध्यक्ष', hi: 'उपाध्यक्ष', zh: '副主席', ta: 'துணைத் தலைவர்' },
      order: 2
    },
    secretary: { 
      label: { en: 'Secretary', ne: 'सचिव', hi: 'सचिव', zh: '秘书', ta: 'செயலாளர்' },
      order: 3
    },
    treasurer: { 
      label: { en: 'Treasurer', ne: 'कोषाध्यक्ष', hi: 'कोषाध्यक्ष', zh: '财务主管', ta: 'பொருளாளர்' },
      order: 4
    },
    coordinator: { 
      label: { en: 'Coordinator', ne: 'संयोजक', hi: 'संयोजक', zh: '协调员', ta: 'ஒருங்கிணைப்பாளர்' },
      order: 5
    },
    coCoordinator: { 
      label: { en: 'Co-Coordinator', ne: 'सह-संयोजक', hi: 'सह-संयोजक', zh: '联合协调员', ta: 'இணை ஒருங்கிணைப்பாளர்' },
      order: 6
    },
    member: { 
      label: { en: 'Member', ne: 'सदस्य', hi: 'सदस्य', zh: '成员', ta: 'உறுப்பினர்' },
      order: 7
    },
    volunteer: { 
      label: { en: 'Volunteer / Service Member', ne: 'सेवक', hi: 'सेवक', zh: '志愿者', ta: 'தன்னார்வலர்' },
      order: 8
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const fetchTeam = async () => {
    setLoading(true);
    try {
      const [teamRes, settingsRes] = await Promise.all([
        api.get('/admin/team'),
        api.get('/admin/settings').catch(() => null),
      ]);
      setTeam(teamRes.data);
      setSettings(settingsRes?.data || null);
    } catch (error) {
      console.error('Error fetching team:', error);
      setError('Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const getLocalizedText = (obj) => {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    return obj[lang] || obj.en || '';
  };

  const getRoleLabel = (roleType) => {
    return roleHierarchy[roleType]?.label?.[lang] || roleType;
  };

  // Fallback shown when a founder has no role text saved on the record
  const founderRoleLabel = roleHierarchy.founder.label;

  // Saved role text, except that an untranslated copy of a built-in English
  // label (e.g. "Founder / Patron") is shown in the reader's language.
  const getRoleText = (role, roleType) => {
    const text = getLocalizedText(role);
    const builtIn = roleHierarchy[roleType]?.label;
    if (builtIn && text && text.trim() === builtIn.en) return builtIn[lang] || text;
    return text;
  };

  // Separate founder from other members
  const founderMembers = team
    .filter(member => member.enabled !== false && member.roleType === 'founder')
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const otherMembers = team
    .filter(member => member.enabled !== false && member.roleType !== 'founder')
    .sort((a, b) => {
      const orderA = roleHierarchy[a.roleType]?.order ?? 99;
      const orderB = roleHierarchy[b.roleType]?.order ?? 99;
      if (orderA !== orderB) return orderA - orderB;
      return (a.order || 0) - (b.order || 0);
    });

  // ===== committee content from Admin → Team =====
  const getLocalized = (obj) => {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    return obj[lang] || obj.en || '';
  };

  const teamContent = (settings?.teamContent || [])
    .filter((s) => s && s.enabled !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const pageTitle =
    getLocalized(settings?.teamPageTitle) || t.teamTitle || 'Our Team';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-10 sm:pt-14 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto py-12 text-center">
          <OmLoader size="lg" color="maroon" className="mx-auto" />
          <p className="text-gray-500 mt-4">{t.a6_teamLoading || 'Loading team members...'}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 pt-10 sm:pt-14 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto py-12 text-center">
          <p className="text-red-500">{t.a6_teamLoadFailed || error}</p>
          <button onClick={fetchTeam} className="mt-4 text-[#A80808] hover:underline">
            {t.a6_teamTryAgain || 'Try Again'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-10 sm:pt-14 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto pb-12">
        <div className="mb-12">
          <PageHeader sub={t.teamSubtitle || 'Meet the dedicated individuals behind Shree Ramchandra Temple'}>
            {pageTitle}
          </PageHeader>
        </div>

        {/* ===== COMMITTEE CONTENT (from Admin → Team) ===== */}
        {teamContent.map((section, sIndex) => {
          const secTitle = getLocalized(section.title);
          const listTitleText = getLocalized(section.listTitle);
          const paragraphs = Object.keys(section.paragraphs || {})
            .map((pKey) => getLocalized(section.paragraphs[pKey]))
            .filter(Boolean);
          const points = (section.points || []).map(getLocalized).filter(Boolean);
          if (!secTitle && paragraphs.length === 0 && points.length === 0) return null;

          return (
            <section key={section.key || sIndex} className={sIndex === 0 ? '' : 'mt-14'}>
              {secTitle && (
                <SubTitle size="md" className="mb-3">{secTitle}</SubTitle>
              )}
              {paragraphs.map((text, i) => (
                <p key={i} className="text-[#4A4A50] leading-relaxed text-base text-justify mt-3">
                  {text}
                </p>
              ))}
              {listTitleText && (
                <p className="font-semibold text-[#A80808] mt-4 mb-2">{listTitleText}</p>
              )}
              {points.length > 0 && (
                <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2 mt-3">
                  {points.map((point, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span
                        className="shrink-0 mt-2 w-1.5 h-1.5 rounded-full"
                        style={{ background: '#A80808' }}
                      />
                      <span className="text-[#4A4A50] leading-relaxed text-base">{point}</span>
                    </li>
                  ))}
                </ul>
              )}

              {section.showMembers && (
                <div className="mt-8">
                  {founderMembers.length > 0 && (
                    <div className="mb-12">
                      {founderMembers.map((founder) => {
                        const founderName = getLocalizedText(founder.name);
                        return (
                          <div
                            key={founder._id}
                            className="relative overflow-hidden rounded-2xl bg-[#820606] shadow-2xl"
                          >
                            <div className="relative z-10 p-8 md:p-10 flex flex-col items-center text-center gap-6">
                              <div>
                                <div className="text-brand-100 text-xs font-medium tracking-wider uppercase">
                                  {getRoleText(founder.role, 'founder') || getLocalizedText(founderRoleLabel)}
                                </div>
                                <h3 className="font-serif text-2xl md:text-3xl font-bold text-white leading-tight mt-1">
                                  {founderName || t.a6_teamUnknown || 'Unknown'}
                                </h3>
                                {getLocalizedText(founder.bio) && (
                                  <p className="text-white/70 text-sm sm:text-base leading-relaxed mt-2">
                                    {getLocalizedText(founder.bio)}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {otherMembers.length > 0 ? (
                    <div className="snake-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {otherMembers.map((member) => {
                        const memberName = getLocalizedText(member.name);
                        const memberRole = getRoleText(member.role, member.roleType);
                        const roleLabel = memberRole || getRoleLabel(member.roleType);

                        return (
                          <div
                            key={member._id}
                            className="snake-card group relative bg-white rounded-2xl p-[3px] shadow-sm hover:shadow-2xl hover:shadow-[#A80808]/10 hover:-translate-y-1 transition-all duration-300"
                          >
                            <div className="relative h-full bg-white rounded-[13px] p-5 sm:p-6 flex flex-col items-center text-center overflow-hidden">
                              <div className="absolute inset-0 bg-gradient-to-br from-[#A80808]/10 via-transparent to-[#820606]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                              {/* Optional details sit at the very top, and the
                                  name/role block stays centred in what is left */}
                              {(member.age || member.email || member.phone) && (
                                <div className="relative w-full pb-4 mb-4 border-b border-gray-100 space-y-1">
                                  {member.age ? (
                                    <p className="text-xs text-gray-400">
                                      {t.age || 'Age'}: {member.age}
                                    </p>
                                  ) : null}
                                  {member.email && (
                                    <a
                                      href={`mailto:${member.email}`}
                                      className="block text-xs text-gray-400 hover:text-[#A80808] transition-colors truncate"
                                    >
                                      {member.email}
                                    </a>
                                  )}
                                  {member.phone && (
                                    <a
                                      href={`tel:${member.phone}`}
                                      className="block text-xs text-gray-400 hover:text-[#A80808] transition-colors truncate"
                                    >
                                      {member.phone}
                                    </a>
                                  )}
                                </div>
                              )}

                              <div className="relative flex-1 flex flex-col items-center justify-center">
                                <h3 className="font-serif font-bold text-gray-800 text-lg leading-snug group-hover:text-[#A80808] transition-colors duration-200">
                                  {memberName || t.a6_teamUnknown || 'Unknown'}
                                </h3>

                                {roleLabel && (
                                  <span className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#A80808]/5 text-[#A80808] group-hover:bg-[#A80808] group-hover:text-white transition-colors duration-200">
                                    {roleLabel}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <div className="text-6xl text-gray-300 mb-3 font-serif">🕉️</div>
                      <p className="text-gray-500">{t.a6_teamNoMembers || 'No committee members found'}</p>
                    </div>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>

      <style>{`
        @property --snake-angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }
        .snake-card {
          border-radius: 1rem;
          transition: box-shadow 0.3s ease, transform 0.3s ease;
        }
        .snake-card::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 3px;
          background: conic-gradient(
            from var(--snake-angle),
            transparent 0deg 240deg,
            #A80808 265deg,
            #820606 300deg,
            #E7B54A 330deg,
            #A80808 360deg
          );
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
          mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          mask-composite: exclude;
          animation: snake-crawl 3s linear infinite;
          opacity: 0.55;
          transition: opacity 0.25s ease;
          pointer-events: none;
          z-index: 0;
        }
        .snake-card:hover::before {
          opacity: 1;
        }
        @keyframes snake-crawl {
          to { --snake-angle: 360deg; }
        }
        .snake-card > * {
          position: relative;
          z-index: 1;
        }
      `}</style>
    </div>
  );
};

export default TeamPage;
