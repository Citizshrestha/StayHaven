import React from 'react';

/**
 * Standardized page header.
 * - title / subtitle
 * - actions: right-aligned button group
 * - toolbar: optional row underneath for search/filter/sort controls
 */
export default function PageHeader({ title, subtitle, actions, toolbar }) {
  return (
    <div className="ha-page-header">
      <div className="ha-page-header__row">
        <div>
          <h1 className="ha-page-header__title">{title}</h1>
          {subtitle && <p className="ha-page-header__subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="ha-page-header__actions">{actions}</div>}
      </div>
      {toolbar && <div className="ha-toolbar">{toolbar}</div>}
    </div>
  );
}
