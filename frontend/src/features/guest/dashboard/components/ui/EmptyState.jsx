import React from 'react';
import PropTypes from 'prop-types';

const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="text-center px-6 py-12 rounded-(--g-radius-lg) bg-(--g-surface) border border-(--g-border)">
    {Icon && (
      <span className="w-14 h-14 mx-auto mb-4 rounded-(--g-radius-md) bg-(--g-primary-tint) text-(--g-primary-text) flex items-center justify-center">
        <Icon className="w-7 h-7" aria-hidden="true" />
      </span>
    )}
    <p className="g-h2 text-(--g-text)">{title}</p>
    {description && <p className="g-small text-(--g-text-muted) mt-1 max-w-sm mx-auto">{description}</p>}
    {action && <div className="mt-5 flex justify-center">{action}</div>}
  </div>
);

EmptyState.propTypes = {
  icon: PropTypes.elementType,
  title: PropTypes.node.isRequired,
  description: PropTypes.node,
  action: PropTypes.node,
};

export default EmptyState;
