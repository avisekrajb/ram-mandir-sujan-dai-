import React from 'react';
import { Link } from 'react-router-dom';
import { LockKeyhole } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { Button, EmptyState, Panel } from './kit/kit';

/** Shown in place of a page the signed-in admin has no access to. */
const NoAccess = ({ superOnly }) => {
  const { t } = useLanguage();
  return (
    <Panel className="mx-auto mt-6 max-w-xl">
      <EmptyState
        icon={LockKeyhole}
        title={superOnly ? (t.k7_superOnlyTitle || 'Super administrator only') : (t.k7_noAccessTitle || 'You do not have access to this page')}
        text={superOnly
          ? (t.k7_superOnlyText || 'This page is for the super administrator.')
          : (t.k7_noAccessText || 'The super administrator chose which parts of the admin panel each admin can use. Ask them if you need this one.')}
        action={<Link to="/admin/overview"><Button variant="primary">{t.k7_backToOverview || 'Back to overview'}</Button></Link>}
      />
    </Panel>
  );
};

export default NoAccess;
