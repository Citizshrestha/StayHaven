import React from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../../../../core/utils/cn';
import { formatMoney } from '../../utils/format';

const SIZES = { sm: 'g-small font-semibold', md: 'g-money', lg: 'g-money-lg' };

const Money = ({ amount, decimals = 2, size, className }) => (
  <span className={cn('guestNum whitespace-nowrap', size && SIZES[size], className)}>
    {formatMoney(amount, decimals)}
  </span>
);

Money.propTypes = {
  amount: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  decimals: PropTypes.number,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  className: PropTypes.string,
};

export default Money;
