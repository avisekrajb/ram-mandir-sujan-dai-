import React from 'react';
import PageHeader from './PageHeader';

/**
 * PageHero — maroon banner variant of the standard page title.
 *
 * Donate, My Bookings, Profile and the dynamic footer pages use a coloured
 * banner while the rest of the site uses PageHeader on a light background.
 * Both delegate their typography to PageHeader, so the title keeps the same
 * size and weight everywhere; only the background differs (a light panel).
 */
const PageHero = ({ title, sub }) => {
  return (
    <div className="border-b border-line bg-panel px-5 py-12 sm:py-14">
      <PageHeader sub={sub}>
        {title}
      </PageHeader>
    </div>
  );
};

export default PageHero;