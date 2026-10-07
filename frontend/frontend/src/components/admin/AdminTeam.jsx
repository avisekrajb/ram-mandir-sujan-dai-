import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown, ChevronUp, Crown, Eye, EyeOff, HeartHandshake, LayoutGrid,
  MoveDown, MoveUp, Pencil, Plus, Save, Shield, Star, Trash2, User,
  UserCheck, UserCog, UserPlus, Users
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import LanguageSwitcher from '../common/LanguageSwitcher';
import api from '../../services/api';
import { Button, Field, Pill, SearchBox, Segmented, SelectBox, Toggle, inputCls } from './kit/kit';
import { Modal } from './kit/Overlays';
import { Card, Dropzone, SaveBar } from './kit/PageShell';

const PARA_KEYS = ['p1', 'p2', 'p3', 'p4'];

const getLocalizedValue = (obj, lang) => {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  return obj[lang] || obj.en || '';
};

const emptyPageLocalized = { en: '', ne: '', hi: '', zh: '', ta: '' };
const emptyLocalized = () => ({ en: '', ne: '', hi: '', zh: '', ta: '' });

/** One committee-content section as a compact row. */
const ContentRow = ({ n, section, lang, index, total, labels, onEdit, onMove, onRemove, onToggleMembers }) => {
  const paras = PARA_KEYS.filter((p) => (getLocalizedValue(section.paragraphs?.[p], lang) || '').trim()).length;
  const points = (section.points || []).filter((pt) => (getLocalizedValue(pt, lang) || '').trim()).length;
  return (
    <li className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-white px-3 py-2.5 transition-colors hover:border-brand-300">
      <span aria-hidden="true" className="w-6 shrink-0 text-center text-xs font-semibold text-mute">{n}</span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
        {getLocalizedValue(section.title, lang) || labels.untitled}
      </span>
      <span className="hidden shrink-0 text-xs text-mute sm:inline">
        {labels.paras}: {paras || '—'} · {labels.points}: {points || '—'}
      </span>
      {section.showMembers && <Pill tone="red" icon={Users}>{labels.members}</Pill>}
      <div className="flex shrink-0 items-center gap-1">
        <button type="button" onClick={() => onToggleMembers()} aria-pressed={Boolean(section.showMembers)} title={labels.membersHint} className={`rounded-lg p-1.5 transition-colors ${section.showMembers ? 'bg-brand-50 text-vermilion' : 'text-mute hover:bg-panel hover:text-ink'}`}>
          <Users size={15} aria-hidden="true" />
        </button>
        <button type="button" onClick={() => onMove(-1)} disabled={index === 0} aria-label={labels.up} className="rounded-lg p-1.5 text-mute transition-colors hover:bg-panel hover:text-ink disabled:opacity-30">
          <ChevronUp size={15} aria-hidden="true" />
        </button>
        <button type="button" onClick={() => onMove(1)} disabled={index === total - 1} aria-label={labels.down} className="rounded-lg p-1.5 text-mute transition-colors hover:bg-panel hover:text-ink disabled:opacity-30">
          <ChevronDown size={15} aria-hidden="true" />
        </button>
        <button type="button" onClick={onEdit} className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1 text-xs font-semibold text-ink-soft transition-colors hover:border-vermilion hover:text-vermilion">
          <Pencil size={12} aria-hidden="true" /> {labels.edit}
        </button>
        <button type="button" onClick={onRemove} aria-label={labels.remove} className="rounded-lg p-1.5 text-mute transition-colors hover:bg-red-50 hover:text-red-600">
          <Trash2 size={15} aria-hidden="true" />
        </button>
      </div>
    </li>
  );
};

const AdminTeam = ({ team, setTeam, t = {} }) => {
  const { showToast } = useToast();
  const { lang: uiLang } = useLanguage();
  const [editing, setEditing] = useState(null);
  const [activeLang, setActiveLang] = useState('en');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [roleLabels, setRoleLabels] = useState({});

  const [teamContent, setTeamContent] = useState([]);
  const [contentBaseline, setContentBaseline] = useState(null);
  const [teamPageTitle, setTeamPageTitle] = useState(emptyPageLocalized);
  const [contentLang, setContentLang] = useState('ne');
  const [savingContent, setSavingContent] = useState(false);
  const [contentEdit, setContentEdit] = useState(null);

  const photoRef = useRef(null);

  // Role order decides how the members are ranked; the labels themselves come
  // from the server so an admin can rename them.
  const roleDefinitions = {
    founder: { icon: Crown, color: 'text-yellow-600', bg: 'bg-yellow-100', order: 0 },
    president: { icon: Shield, color: 'text-brand-600', bg: 'bg-brand-100', order: 1 },
    vicePresident: { icon: Shield, color: 'text-brand-600', bg: 'bg-brand-100', order: 2 },
    secretary: { icon: UserCheck, color: 'text-brand-600', bg: 'bg-brand-100', order: 3 },
    treasurer: { icon: UserCog, color: 'text-brand-600', bg: 'bg-brand-100', order: 4 },
    coordinator: { icon: Star, color: 'text-amber-600', bg: 'bg-amber-100', order: 5 },
    coCoordinator: { icon: Star, color: 'text-brand-600', bg: 'bg-brand-100', order: 6 },
    member: { icon: UserPlus, color: 'text-brand-600', bg: 'bg-brand-100', order: 7 },
    volunteer: { icon: HeartHandshake, color: 'text-brand-600', bg: 'bg-brand-100', order: 8 },
  };

  useEffect(() => {
    const fetchRoleData = async () => {
      try {
        const [roleRes, settingsRes] = await Promise.all([
          api.get('/admin/team/roles'),
          api.get('/admin/settings').catch(() => null),
        ]);
        setRoleLabels(roleRes.data.labels || {});
        if (settingsRes?.data) {
          if (Array.isArray(settingsRes.data.teamContent)) setTeamContent(settingsRes.data.teamContent);
          if (settingsRes.data.teamPageTitle) setTeamPageTitle(settingsRes.data.teamPageTitle);
          // Both halves of this card are saved together, so both count towards "unsaved".
          setContentBaseline({
            teamContent: settingsRes.data.teamContent || [],
            teamPageTitle: settingsRes.data.teamPageTitle || emptyPageLocalized,
          });
        }
      } catch (error) {
        console.error('Error fetching role data:', error);
      }
    };
    fetchRoleData();
  }, []);

  const blank = () => ({
    photo: null,
    name: emptyLocalized(),
    role: emptyLocalized(),
    roleType: 'member',
    bio: emptyLocalized(),
    email: '',
    phone: '',
    age: '',
    order: team.length,
    enabled: true,
  });

  const getRoleIcon = (rt) => roleDefinitions[rt]?.icon || User;
  const getRoleColor = (rt) => roleDefinitions[rt]?.color || 'text-gray-600';
  const getRoleBg = (rt) => roleDefinitions[rt]?.bg || 'bg-gray-100';
  const getRoleLabel = (rt, lang = 'en') =>
    (roleLabels[rt] && (roleLabels[rt][lang] || roleLabels[rt].en)) || rt;

  // Saved role text, except that an untranslated copy of a built-in English
  // label (e.g. "Founder / Patron") is shown in the admin's UI language.
  // Display only: the saved value is never changed.
  const getRoleText = (text) => {
    const trimmed = (text || '').trim();
    if (!trimmed) return trimmed;
    const key = Object.keys(roleLabels).find((k) => roleLabels[k]?.en === trimmed);
    return key ? roleLabels[key][uiLang] || trimmed : trimmed;
  };

  const getRoleOptions = () =>
    Object.keys(roleDefinitions).map((key) => ({ value: key, label: getRoleLabel(key, activeLang) }));

  const handleSave = async () => {
    if (!editing.name?.en?.trim()) {
      showToast(t.a4_teamNameRequired || 'Name is required (English)', 'error');
      return;
    }
    if (!editing.roleType) {
      showToast(t.a4_teamSelectRole || 'Please select a role type', 'error');
      return;
    }
    setLoading(true);
    try {
      const customRole = (editing.role?.en || '').trim();
      const payload = {
        ...editing,
        age: editing.age === '' || editing.age === null || editing.age === undefined ? null : Number(editing.age),
        role: { ...editing.role, en: customRole || getRoleLabel(editing.roleType, 'en') },
      };
      if (editing._id) {
        const res = await api.put(`/admin/team/${editing._id}`, payload);
        setTeam(team.map((m) => (m._id === editing._id ? res.data : m)));
        showToast(t.a4_teamMemberUpdated || 'Team member updated successfully', 'success');
      } else {
        const res = await api.post('/admin/team', payload);
        setTeam([...team, res.data]);
        showToast(t.a4_teamMemberAdded || 'Team member added successfully', 'success');
      }
      setEditing(null);
    } catch (error) {
      console.error('Save team error:', error);
      showToast(error.response?.data?.message || (t.a4_teamSaveFailed || 'Failed to save team member'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t.a4_teamDeleteConfirm || 'Delete this team member?')) return;
    setLoading(true);
    try {
      await api.delete(`/admin/team/${id}`);
      setTeam(team.filter((m) => m._id !== id));
      showToast(t.a4_teamMemberDeleted || 'Team member deleted successfully', 'success');
    } catch (error) {
      console.error('Delete team error:', error);
      showToast(error.response?.data?.message || (t.a4_teamDeleteFailed || 'Failed to delete team member'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast(t.uploadImageOnly || 'Please upload an image file', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast(t.imageTooLarge || 'Image must be less than 5MB', 'error');
      return;
    }
    setUploading(true);
    const body = new FormData();
    body.append('image', file);
    if (editing._id) body.append('teamId', editing._id);
    try {
      const res = await api.post('/admin/upload/team', body, { headers: { 'Content-Type': 'multipart/form-data' } });
      setEditing((prev) => ({ ...prev, photo: res.data.url }));
      showToast(t.a4_photoUploaded || 'Photo uploaded successfully', 'success');
    } catch (error) {
      console.error('Upload error:', error);
      showToast(error.response?.data?.message || (t.a3_c_uploadFailed || 'Upload failed'), 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleToggleEnabled = async (member) => {
    const newEnabled = !member.enabled;
    try {
      const res = await api.put(`/admin/team/${member._id}`, { ...member, enabled: newEnabled });
      setTeam(team.map((m) => (m._id === member._id ? res.data : m)));
      showToast(newEnabled ? (t.a4_teamMemberEnabled || 'Member enabled') : (t.a4_teamMemberDisabled || 'Member disabled'), 'success');
    } catch (error) {
      console.error('Toggle enabled error:', error);
      showToast(t.a4_teamStatusUpdateFailed || 'Failed to update status', 'error');
    }
  };

  const filteredTeam = team
    .filter((member) => {
      const name = (member.name?.en || '').toLowerCase();
      const email = (member.email || '').toLowerCase();
      const s = searchTerm.toLowerCase();
      const matchesSearch = name.includes(s) || email.includes(s);
      const matchesStatus =
        filterStatus === 'all' ||
        (filterStatus === 'active' && member.enabled !== false) ||
        (filterStatus === 'hidden' && member.enabled === false);
      const matchesRole = filterRole === 'all' || member.roleType === filterRole;
      return matchesSearch && matchesStatus && matchesRole;
    })
    .sort((a, b) => {
      const oa = roleDefinitions[a.roleType]?.order ?? 99;
      const ob = roleDefinitions[b.roleType]?.order ?? 99;
      if (oa !== ob) return oa - ob;
      return (a.order || 0) - (b.order || 0);
    });

  // ===== committee page content =====
  const patchSection = (index, fn) => setTeamContent((prev) => prev.map((s, i) => (i === index ? fn(s) : s)));

  const addContentSection = () => {
    setTeamContent([
      ...teamContent,
      {
        key: `team_${Date.now()}`,
        title: emptyLocalized(),
        paragraphs: { p1: emptyLocalized(), p2: emptyLocalized(), p3: emptyLocalized(), p4: emptyLocalized() },
        listTitle: emptyLocalized(),
        points: [],
        showMembers: false,
        order: teamContent.length,
        enabled: true,
      },
    ]);
    setContentEdit(teamContent.length);
  };

  const removeContentSection = (index) => {
    if (!window.confirm(t.a4_removeSectionConfirm || 'Remove this section?')) return;
    setTeamContent(teamContent.filter((_, i) => i !== index));
    setContentEdit(null);
  };

  const moveContentSection = (index, dir) => {
    const next = [...teamContent];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setTeamContent(next.map((s, i) => ({ ...s, order: i })));
  };

  const updateContentField = (index, field, value) =>
    patchSection(index, (s) => ({ ...s, [field]: { ...(s[field] || {}), [contentLang]: value } }));
  const updateContentParagraph = (index, pKey, value) =>
    patchSection(index, (s) => ({ ...s, paragraphs: { ...(s.paragraphs || {}), [pKey]: { ...(s.paragraphs?.[pKey] || {}), [contentLang]: value } } }));
  const addContentPoint = (index) => patchSection(index, (s) => ({ ...s, points: [...(s.points || []), emptyLocalized()] }));
  const updateContentPoint = (index, pi, value) =>
    patchSection(index, (s) => ({ ...s, points: (s.points || []).map((p, i) => (i === pi ? { ...(p || {}), [contentLang]: value } : p)) }));
  const removeContentPoint = (index, pi) =>
    patchSection(index, (s) => ({ ...s, points: (s.points || []).filter((_, i) => i !== pi) }));
  const moveContentPoint = (index, pi, dir) =>
    patchSection(index, (s) => {
      const points = [...(s.points || [])];
      const target = pi + dir;
      if (target < 0 || target >= points.length) return s;
      [points[pi], points[target]] = [points[target], points[pi]];
      return { ...s, points };
    });

  const saveTeamContent = async () => {
    setSavingContent(true);
    try {
      await api.put('/admin/settings', { teamPageTitle, teamContent: teamContent.map((s, i) => ({ ...s, order: i })) });
      setContentBaseline({ teamContent, teamPageTitle });
      showToast(t.a4_teamContentSaved || 'Committee content saved', 'success');
    } catch (error) {
      console.error('Error saving team content:', error);
      showToast(error.response?.data?.message || (t.a4_teamContentSaveFailed || 'Failed to save committee content'), 'error');
    } finally {
      setSavingContent(false);
    }
  };

  // The page title and the sections are saved by one button, so either of them
// changing has to raise the save bar.
const contentDirty = contentBaseline
    ? JSON.stringify({ teamContent, teamPageTitle }) !== JSON.stringify(contentBaseline)
    : false;
  const editingContent = contentEdit === null ? null : teamContent[contentEdit] || null;

  const contentLabels = {
    untitled: t.a4_teamUntitledSection || 'Untitled section',
    paras: t.a4_teamParas || 'Paras',
    points: t.a4_teamPoints || 'Points',
    members: t.a4_teamMembersCol || 'Members',
    membersHint: t.a4_teamRenderMembersHint || 'Render the member list at this section',
    up: t.a3_c_moveUp || 'Move up',
    down: t.a3_c_moveDown || 'Move down',
    edit: t.edit || 'Edit',
    remove: t.remove || 'Remove',
  };

  return (
    <div className="space-y-4 pb-2">
      <Card
        n={1}
        icon={Users}
        title={t.manageTeam || 'Team Members'}
        description={(t.a4_teamShowingOf || 'Showing {shown} of {total} members')
          .replace('{shown}', filteredTeam.length)
          .replace('{total}', team.length)}
        actions={
          <>
            <LanguageSwitcher active={activeLang} onChange={setActiveLang} t={t} />
            <Button variant="primary" icon={Plus} onClick={() => setEditing(blank())}>
              {t.add || 'Add Member'}
            </Button>
          </>
        }
      >
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <SearchBox
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder={t.a4_teamSearchPlaceholder || 'Search members...'}
            className="w-full sm:w-56"
          />
          <SelectBox
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            aria-label={t.a4_teamFilterByRole || 'Filter by role'}
            className="w-auto min-w-[9rem]"
          >
            <option value="all">{t.a4_teamAllRoles || 'All Roles'}</option>
            {getRoleOptions().map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </SelectBox>
          <SelectBox
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            aria-label={t.a4_teamFilterByStatus || 'Filter by status'}
            className="w-auto min-w-[8rem]"
          >
            <option value="all">{t.a4_teamAllStatus || 'All Status'}</option>
            <option value="active">{t.a3_c_active || 'Active'}</option>
            <option value="hidden">{t.a3_c_hidden || 'Hidden'}</option>
          </SelectBox>
          <div className="ml-auto">
            <Segmented
              label={t.a2_viewMode || 'View'}
              value={viewMode}
              onChange={setViewMode}
              options={[
                { value: 'grid', label: t.a4_teamGrid || 'Grid' },
                { value: 'list', label: t.a4_teamList || 'List' },
              ]}
            />
          </div>
        </div>

        {filteredTeam.length === 0 ? (
          <div className="py-12 text-center">
            <Users size={40} className="mx-auto mb-3 text-ink-soft/30" aria-hidden="true" />
            <p className="text-sm text-ink-soft">
              {searchTerm || filterStatus !== 'all' || filterRole !== 'all'
                ? (t.a4_teamNoMatch || 'No members found matching your filters')
                : (t.a4_teamNoMembers || 'No team members added yet')}
            </p>
            {(searchTerm || filterStatus !== 'all' || filterRole !== 'all') && (
              <Button className="mt-2" onClick={() => { setSearchTerm(''); setFilterStatus('all'); setFilterRole('all'); }}>
                {t.a4_teamClearFilters || 'Clear filters'}
              </Button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {filteredTeam.map((member) => {
              const RoleIcon = getRoleIcon(member.roleType);
              const hidden = member.enabled === false;
              return (
                <article key={member._id} className="group overflow-hidden rounded-xl border border-line bg-white transition-shadow hover:shadow-md">
                  <div className="relative aspect-square bg-gradient-to-br from-vermilion/10 to-maroon-deep/5">
                    {member.photo ? (
                      <img src={member.photo} alt={member.name?.en} className="h-full w-full object-cover object-top" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <User size={36} className="text-ink-soft/30" aria-hidden="true" />
                      </div>
                    )}
                    <div className="absolute left-2 top-2">
                      <Pill tone={hidden ? 'neutral' : 'green'}>{hidden ? (t.a3_c_hidden || 'Hidden') : (t.a3_c_active || 'Active')}</Pill>
                    </div>
                    <div className="absolute right-2 top-2">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${getRoleBg(member.roleType)} ${getRoleColor(member.roleType)}`}>
                        <RoleIcon size={11} aria-hidden="true" />
                        {getRoleLabel(member.roleType, activeLang)}
                      </span>
                    </div>
                  </div>
                  <div className="p-3">
                    <h5 className="truncate font-serif text-sm font-semibold text-ink">
                      {member.name?.ne || member.name?.en || t.a4_unknown || 'Unknown'}
                    </h5>
                    <p className={`truncate text-xs font-medium ${getRoleColor(member.roleType)}`}>
                      {getRoleText(member.role?.ne) || getRoleLabel(member.roleType, 'ne')}
                    </p>
                    <div className="mt-2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditing(member)}
                        className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-line px-2 py-1 text-xs font-semibold text-ink-soft transition-colors hover:border-vermilion hover:text-vermilion"
                      >
                        <Pencil size={12} aria-hidden="true" /> {t.edit || 'Edit'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleEnabled(member)}
                        aria-label={hidden ? (t.a3_c_show || 'Show') : (t.a3_c_hide || 'Hide')}
                        className="rounded-lg border border-line p-1.5 text-mute transition-colors hover:bg-panel hover:text-ink"
                      >
                        {hidden ? <Eye size={14} aria-hidden="true" /> : <EyeOff size={14} aria-hidden="true" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(member._id)}
                        aria-label={t.delete || 'Delete'}
                        className="rounded-lg border border-line p-1.5 text-mute transition-colors hover:border-red-50 hover:text-red-600"
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left">
                  <th className="pb-2 text-xs font-bold uppercase tracking-wide text-mute">{t.a4_photo || 'Photo'}</th>
                  <th className="pb-2 text-xs font-bold uppercase tracking-wide text-mute">{t.a4_teamName || 'Name'}</th>
                  <th className="hidden pb-2 text-xs font-bold uppercase tracking-wide text-mute md:table-cell">{t.role || 'Role'}</th>
                  <th className="hidden pb-2 text-xs font-bold uppercase tracking-wide text-mute lg:table-cell">{t.email || 'Email'}</th>
                  <th className="pb-2 text-xs font-bold uppercase tracking-wide text-mute">{t.status || 'Status'}</th>
                  <th className="pb-2 text-right text-xs font-bold uppercase tracking-wide text-mute">{t.actions || 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeam.map((member) => {
                  const RoleIcon = getRoleIcon(member.roleType);
                  const hidden = member.enabled === false;
                  return (
                    <tr key={member._id} className="border-b border-line transition-colors hover:bg-panel">
                      <td className="py-2.5">
                        <div className="h-8 w-8 overflow-hidden rounded-full bg-gray-100">
                          {member.photo ? (
                            <img src={member.photo} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-vermilion to-maroon text-xs font-bold text-white">
                              {(member.name?.en || '?').charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 font-medium text-ink">{member.name?.ne || member.name?.en || t.a4_unknown || 'Unknown'}</td>
                      <td className="hidden py-2.5 md:table-cell">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${getRoleBg(member.roleType)} ${getRoleColor(member.roleType)}`}>
                          <RoleIcon size={11} aria-hidden="true" />
                          {getRoleText(member.role?.ne) || getRoleLabel(member.roleType, 'ne')}
                        </span>
                      </td>
                      <td className="hidden py-2.5 text-xs text-ink-soft lg:table-cell">{member.email || '—'}</td>
                      <td className="py-2.5">
                        <Pill tone={hidden ? 'neutral' : 'green'}>{hidden ? (t.a3_c_hidden || 'Hidden') : (t.a3_c_active || 'Active')}</Pill>
                      </td>
                      <td className="py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <button type="button" onClick={() => setEditing(member)} aria-label={t.edit || 'Edit'} className="rounded-lg p-1.5 text-mute transition-colors hover:bg-panel hover:text-ink">
                            <Pencil size={14} aria-hidden="true" />
                          </button>
                          <button type="button" onClick={() => handleToggleEnabled(member)} aria-label={hidden ? (t.a3_c_show || 'Show') : (t.a3_c_hide || 'Hide')} className="rounded-lg p-1.5 text-mute transition-colors hover:bg-panel hover:text-ink">
                            {hidden ? <Eye size={14} aria-hidden="true" /> : <EyeOff size={14} aria-hidden="true" />}
                          </button>
                          <button type="button" onClick={() => handleDelete(member._id)} aria-label={t.delete || 'Delete'} className="rounded-lg p-1.5 text-mute transition-colors hover:bg-red-50 hover:text-red-600">
                            <Trash2 size={14} aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card
        n={2}
        icon={LayoutGrid}
        title={t.a4_teamCommitteeContent || 'Committee Page Content'}
        description={t.a4_teamCommitteeContentHint || 'The headings and text around the member list on the public committee page.'}
        actions={
          <>
            <LanguageSwitcher active={contentLang} onChange={setContentLang} t={t} />
            <Button variant="primary" icon={Plus} onClick={addContentSection}>
              {t.a4_addSection || 'Add Section'}
            </Button>
          </>
        }
        bodyClassName="p-3"
      >
        <div className="mb-4 px-2">
          <Field label={t.a4_teamPageTitle || 'Page Title'} htmlFor="team-page-title">
            <input
              id="team-page-title"
              type="text"
              value={getLocalizedValue(teamPageTitle, contentLang)}
              onChange={(e) => setTeamPageTitle({ ...(teamPageTitle || {}), [contentLang]: e.target.value })}
              className={inputCls}
              placeholder="e.g. कार्यसमिति तथा सदस्यहरू"
            />
          </Field>
        </div>

        {teamContent.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-soft">{t.a4_teamNoContentSections || 'No content sections yet.'}</p>
        ) : (
          <ul className="space-y-2">
            {teamContent.map((section, i) => (
              <ContentRow
                key={section.key || i}
                n={i + 1}
                section={section}
                lang={contentLang}
                index={i}
                total={teamContent.length}
                labels={contentLabels}
                onEdit={() => setContentEdit(i)}
                onMove={(dir) => moveContentSection(i, dir)}
                onRemove={() => removeContentSection(i)}
                onToggleMembers={() => patchSection(i, (s) => ({ ...s, showMembers: !s.showMembers }))}
              />
            ))}
          </ul>
        )}
      </Card>

      {/* Member editor */}
      <Modal
        open={Boolean(editing)}
        onClose={loading || uploading ? undefined : () => setEditing(null)}
        size="lg"
        title={editing ? (editing._id ? (t.a4_teamEditMember || 'Edit Team Member') : (t.a4_teamAddNewMember || 'Add New Team Member')) : ''}
        footer={
          <>
            <Button onClick={() => setEditing(null)} disabled={loading || uploading}>{t.cancel || 'Cancel'}</Button>
            <Button variant="primary" icon={Save} loading={loading} disabled={uploading} onClick={handleSave}>
              {editing?._id ? (t.a4_teamUpdateMember || 'Update Member') : (t.a4_teamAddMember || 'Add Member')}
            </Button>
          </>
        }
      >
        {editing && (
          <div className="space-y-5">
            <Field label={t.a4_teamProfilePhoto || 'Profile Photo'}>
              <Dropzone
                inputRef={photoRef}
                onPick={handlePhotoUpload}
                preview={editing.photo}
                busy={uploading}
                boxClassName="h-32"
                onRemove={() => setEditing({ ...editing, photo: null })}
                removeLabel={t.remove || 'Remove'}
                empty={
                  <div className="flex flex-col items-center gap-1.5 p-4 text-center text-ink-soft">
                    <User size={28} aria-hidden="true" />
                    <span className="text-xs font-semibold">{t.a4_teamClickUploadPhoto || 'Click to upload profile photo'}</span>
                    <span className="text-xs text-mute">{t.a4_fileTypesMax5 || 'JPG, PNG, WEBP · 5MB'}</span>
                  </div>
                }
              />
            </Field>

            <div className="mb-4">
              <LanguageSwitcher active={activeLang} onChange={setActiveLang} t={t} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={`${t.a4_teamName || 'Name'} *`} htmlFor="tm-name">
                <input
                  id="tm-name"
                  data-autofocus
                  type="text"
                  value={editing.name[activeLang] || ''}
                  onChange={(e) => setEditing({ ...editing, name: { ...editing.name, [activeLang]: e.target.value } })}
                  className={inputCls}
                  placeholder={t.a4_teamNamePlaceholder || 'Enter name...'}
                />
              </Field>
              <Field label={`${t.a4_teamRoleType || 'Role Type'} *`} htmlFor="tm-role">
                <SelectBox
                  id="tm-role"
                  value={editing.roleType || 'member'}
                  onChange={(e) => {
                    const roleType = e.target.value;
                    setEditing({ ...editing, roleType, role: { ...editing.role, [activeLang]: getRoleLabel(roleType, activeLang) } });
                  }}
                >
                  {getRoleOptions().map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </SelectBox>
              </Field>
            </div>

            <Field
              label={t.a4_teamCustomRole || 'Custom Role Name (Optional)'}
              hint={t.a4_teamCustomRoleHint || 'Leave empty to use default role name'}
              htmlFor="tm-custom-role"
            >
              <input
                id="tm-custom-role"
                type="text"
                value={editing.role[activeLang] || ''}
                onChange={(e) => setEditing({ ...editing, role: { ...editing.role, [activeLang]: e.target.value } })}
                className={inputCls}
                placeholder={t.a4_teamCustomRolePlaceholder || 'Custom role name (overrides default)...'}
              />
            </Field>

            <Field label={t.a4_teamBio || 'Bio / Description'} htmlFor="tm-bio">
              <textarea
                id="tm-bio"
                rows={3}
                value={editing.bio?.[activeLang] || ''}
                onChange={(e) => setEditing({ ...editing, bio: { ...editing.bio, [activeLang]: e.target.value } })}
                className={`${inputCls} resize-y`}
                placeholder={t.a4_teamBioPlaceholder || 'Enter bio...'}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label={t.email || 'Email'} htmlFor="tm-email">
                <input
                  id="tm-email"
                  type="email"
                  value={editing.email || ''}
                  onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                  className={inputCls}
                  placeholder="email@example.com"
                />
              </Field>
              <Field label={t.contactPhone || 'Phone'} htmlFor="tm-phone">
                <input
                  id="tm-phone"
                  type="text"
                  value={editing.phone || ''}
                  onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                  className={inputCls}
                  placeholder="+977-XXXXXXXXXX"
                />
              </Field>
              <Field label={t.age || 'Age'} htmlFor="tm-age">
                <input
                  id="tm-age"
                  type="number"
                  min="1"
                  max="120"
                  value={editing.age ?? ''}
                  onChange={(e) => setEditing({ ...editing, age: e.target.value })}
                  className={inputCls}
                  placeholder={t.a4_optional || 'Optional'}
                />
              </Field>
            </div>

            <div className="rounded-xl border border-line bg-panel p-3">
              <Toggle
                checked={editing.enabled !== false}
                onChange={(v) => setEditing({ ...editing, enabled: v })}
                label={t.a4_showOnWebsite || 'Show on website'}
              />
              <p className="mt-1 text-xs text-ink-soft">{t.a4_teamActiveHint || '(Active members appear on the public team page)'}</p>
            </div>
          </div>
        )}
      </Modal>

      {/* Committee content section editor */}
      <Modal
        open={Boolean(editingContent)}
        onClose={() => setContentEdit(null)}
        size="lg"
        title={editingContent ? (getLocalizedValue(editingContent.title, contentLang) || (t.a4_title || 'Title')) : ''}
        description={t.a4_teamEditSectionHint || 'Heading, paragraphs and bullet points for this part of the committee page.'}
        footer={<Button variant="primary" onClick={() => setContentEdit(null)}>{t.gl_close || 'Close'}</Button>}
      >
        {editingContent && contentEdit !== null && (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t.a4_title || 'Title'} htmlFor="tc-title">
                <input
                  id="tc-title"
                  data-autofocus
                  type="text"
                  value={getLocalizedValue(editingContent.title, contentLang)}
                  onChange={(e) => updateContentField(contentEdit, 'title', e.target.value)}
                  className={inputCls}
                  placeholder={t.a4_sectionTitlePlaceholder || 'Section title...'}
                />
              </Field>
              <Field label={t.a4_listHeading || 'List Heading'} htmlFor="tc-list-title">
                <input
                  id="tc-list-title"
                  type="text"
                  value={getLocalizedValue(editingContent.listTitle, contentLang)}
                  onChange={(e) => updateContentField(contentEdit, 'listTitle', e.target.value)}
                  className={inputCls}
                  placeholder={t.a4_optional || 'Optional'}
                />
              </Field>
            </div>

            <fieldset className="space-y-3 border-t border-line pt-4">
              <legend className="text-sm font-semibold text-ink">{t.a4_paragraphs || 'Paragraphs'}</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {PARA_KEYS.map((pKey) => (
                  <Field key={pKey} label={(t.a4_paragraphN || 'Paragraph {n}').replace('{n}', pKey.slice(1).toUpperCase())} htmlFor={`tc-${pKey}`}>
                    <textarea
                      id={`tc-${pKey}`}
                      rows={2}
                      value={getLocalizedValue(editingContent.paragraphs?.[pKey], contentLang)}
                      onChange={(e) => updateContentParagraph(contentEdit, pKey, e.target.value)}
                      className={`${inputCls} resize-y`}
                    />
                  </Field>
                ))}
              </div>
            </fieldset>

            <fieldset className="space-y-3 border-t border-line pt-4">
              <legend className="text-sm font-semibold text-ink">
                {t.a4_bulletPoints || 'Bullet Points'} ({(editingContent.points || []).length})
              </legend>
              {(editingContent.points || []).length === 0 ? (
                <p className="text-xs text-ink-soft">{t.a4_noBulletPoints || 'No bullet points.'}</p>
              ) : (
                <ul className="space-y-2">
                  {editingContent.points.map((point, pi) => (
                    <li key={pi} className="flex items-center gap-1.5">
                      <span className="w-4 shrink-0 text-center text-xs text-mute">{pi + 1}</span>
                      <input
                        type="text"
                        aria-label={(t.a4_point || 'Point {n}').replace('{n}', pi + 1)}
                        value={getLocalizedValue(point, contentLang)}
                        onChange={(e) => updateContentPoint(contentEdit, pi, e.target.value)}
                        className={inputCls}
                      />
                      <button type="button" onClick={() => moveContentPoint(contentEdit, pi, -1)} disabled={pi === 0} aria-label={t.a3_c_moveUp || 'Move up'} className="rounded-lg p-1.5 text-mute transition-colors hover:bg-panel hover:text-ink disabled:opacity-30">
                        <MoveUp size={14} aria-hidden="true" />
                      </button>
                      <button type="button" onClick={() => moveContentPoint(contentEdit, pi, 1)} disabled={pi === editingContent.points.length - 1} aria-label={t.a3_c_moveDown || 'Move down'} className="rounded-lg p-1.5 text-mute transition-colors hover:bg-panel hover:text-ink disabled:opacity-30">
                        <MoveDown size={14} aria-hidden="true" />
                      </button>
                      <button type="button" onClick={() => removeContentPoint(contentEdit, pi)} aria-label={t.remove || 'Remove'} className="rounded-lg p-1.5 text-mute transition-colors hover:bg-red-50 hover:text-red-600">
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <Button icon={Plus} onClick={() => addContentPoint(contentEdit)}>
                {t.a4_addPoint || 'Add Point'}
              </Button>
            </fieldset>
          </div>
        )}
      </Modal>

      <SaveBar
        dirty={contentDirty}
        saving={savingContent}
        onSave={saveTeamContent}
        saveLabel={t.a4_teamSaveContent || 'Save Content'}
      />
    </div>
  );
};

export default AdminTeam;