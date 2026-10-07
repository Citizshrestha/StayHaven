import React from 'react';
import PropTypes from 'prop-types';

const PageHeader = ({ title, subtitle, actions, filters }) => (
  <header className="mb-5 lg:mb-6">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="g-h1 text-(--g-text)">{title}</h1>
        {subtitle && <p className="g-small text-(--g-text-muted) mt-1 truncate">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
    {filters && <div className="mt-4">{filters}</div>}
  </header>
);

PageHeader.propTypes = {
  title: PropTypes.node.isRequired,
  subtitle: PropTypes.node,
  actions: PropTypes.node,
  filters: PropTypes.node,
};

export default PageHeader;
