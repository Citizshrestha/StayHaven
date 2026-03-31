import React, { createContext, useContext, useReducer, useCallback } from 'react';

// Initial state
const initialState = {
  // UI State
  isDark: false,
  showNotifications: false,
  notifTab: 'all',
  showCmdPalette: false,
  showMessaging: false,
  msgRecipient: 'guest',
  activeRoomFilter: 'all',
  callingChannel: null,
  
  // Modal State
  modals: {
    newBooking: false,
    walkIn: false,
    checkOut: false,
    roomChange: false,
    guestCommunication: false,
    bulkCheckIn: false,
  },
  
  // Data State
  kpiData: [],
  roomStatus: [],
  activityFeed: [],
  guestRequests: [],
  arrivals: [],
  departures: [],
  housekeepingData: [],
  revenueSegments: [],
  weeklyOccupancy: [],
  notifications: [],
  messages: [],
  contacts: { waiters: [], chefs: [], receptionists: [], managers: [] },
  
  // Meta State
  occupancyPct: 0,
  totalRooms: 0,
  unreadNotifCount: 0,
  dashLoading: true,
  hotelId: null,
  activeBookingId: null,
  msgText: '',
};

// Action Types
const ActionTypes = {
  SET_DARK_MODE: 'SET_DARK_MODE',
  TOGGLE_MODAL: 'TOGGLE_MODAL',
  CLOSE_ALL_MODALS: 'CLOSE_ALL_MODALS',
  SET_NOTIFICATIONS_PANEL: 'SET_NOTIFICATIONS_PANEL',
  SET_NOTIF_TAB: 'SET_NOTIF_TAB',
  SET_CMD_PALETTE: 'SET_CMD_PALETTE',
  SET_MESSAGING_PANEL: 'SET_MESSAGING_PANEL',
  SET_MSG_RECIPIENT: 'SET_MSG_RECIPIENT',
  SET_MSG_TEXT: 'SET_MSG_TEXT',
  SET_ROOM_FILTER: 'SET_ROOM_FILTER',
  SET_CALLING_CHANNEL: 'SET_CALLING_CHANNEL',
  SET_DASHBOARD_DATA: 'SET_DASHBOARD_DATA',
  SET_KPI_DATA: 'SET_KPI_DATA',
  SET_ROOM_STATUS: 'SET_ROOM_STATUS',
  SET_ACTIVITY_FEED: 'SET_ACTIVITY_FEED',
  SET_GUEST_REQUESTS: 'SET_GUEST_REQUESTS',
  SET_ARRIVALS: 'SET_ARRIVALS',
  SET_DEPARTURES: 'SET_DEPARTURES',
  SET_HOUSEKEEPING: 'SET_HOUSEKEEPING',
  SET_REVENUE_SEGMENTS: 'SET_REVENUE_SEGMENTS',
  SET_WEEKLY_OCCUPANCY: 'SET_WEEKLY_OCCUPANCY',
  SET_NOTIFICATIONS: 'SET_NOTIFICATIONS',
  ADD_NOTIFICATION: 'ADD_NOTIFICATION',
  MARK_NOTIFICATIONS_READ: 'MARK_NOTIFICATIONS_READ',
  SET_MESSAGES: 'SET_MESSAGES',
  ADD_MESSAGE: 'ADD_MESSAGE',
  SET_CONTACTS: 'SET_CONTACTS',
  SET_HOTEL_ID: 'SET_HOTEL_ID',
  SET_ACTIVE_BOOKING: 'SET_ACTIVE_BOOKING',
  SET_LOADING: 'SET_LOADING',
  UPDATE_KPI_SPARKLINE: 'UPDATE_KPI_SPARKLINE',
};

// Reducer
function receptionReducer(state, action) {
  switch (action.type) {
    case ActionTypes.SET_DARK_MODE:
      return { ...state, isDark: action.payload };
      
    case ActionTypes.TOGGLE_MODAL:
      return {
        ...state,
        modals: {
          ...state.modals,
          [action.payload]: !state.modals[action.payload],
        },
      };
      
    case ActionTypes.CLOSE_ALL_MODALS:
      return {
        ...state,
        modals: {
          newBooking: false,
          walkIn: false,
          checkOut: false,
          roomChange: false,
          guestCommunication: false,
          bulkCheckIn: false,
        },
      };
      
    case ActionTypes.SET_NOTIFICATIONS_PANEL:
      return { ...state, showNotifications: action.payload };
      
    case ActionTypes.SET_NOTIF_TAB:
      return { ...state, notifTab: action.payload };
      
    case ActionTypes.SET_CMD_PALETTE:
      return { ...state, showCmdPalette: action.payload };
      
    case ActionTypes.SET_MESSAGING_PANEL:
      return { ...state, showMessaging: action.payload };
      
    case ActionTypes.SET_MSG_RECIPIENT:
      return { ...state, msgRecipient: action.payload };
      
    case ActionTypes.SET_MSG_TEXT:
      return { ...state, msgText: action.payload };
      
    case ActionTypes.SET_ROOM_FILTER:
      return { ...state, activeRoomFilter: action.payload };
      
    case ActionTypes.SET_CALLING_CHANNEL:
      return { ...state, callingChannel: action.payload };
      
    case ActionTypes.SET_DASHBOARD_DATA:
      return {
        ...state,
        ...action.payload,
        dashLoading: false,
      };
      
    case ActionTypes.SET_KPI_DATA:
      return { ...state, kpiData: action.payload };
      
    case ActionTypes.SET_ROOM_STATUS:
      return { ...state, roomStatus: action.payload };
      
    case ActionTypes.SET_ACTIVITY_FEED:
      return { ...state, activityFeed: action.payload };
      
    case ActionTypes.SET_GUEST_REQUESTS:
      return { ...state, guestRequests: action.payload };
      
    case ActionTypes.SET_ARRIVALS:
      return { ...state, arrivals: action.payload };
      
    case ActionTypes.SET_DEPARTURES:
      return { ...state, departures: action.payload };
      
    case ActionTypes.SET_HOUSEKEEPING:
      return { ...state, housekeepingData: action.payload };
      
    case ActionTypes.SET_REVENUE_SEGMENTS:
      return { ...state, revenueSegments: action.payload };
      
    case ActionTypes.SET_WEEKLY_OCCUPANCY:
      return { ...state, weeklyOccupancy: action.payload };
      
    case ActionTypes.SET_NOTIFICATIONS:
      return { ...state, notifications: action.payload };
      
    case ActionTypes.ADD_NOTIFICATION:
      return {
        ...state,
        notifications: [action.payload, ...state.notifications],
        unreadNotifCount: state.unreadNotifCount + 1,
      };
      
    case ActionTypes.MARK_NOTIFICATIONS_READ:
      return {
        ...state,
        notifications: state.notifications.map(n => ({ ...n, isRead: true })),
        unreadNotifCount: 0,
      };
      
    case ActionTypes.SET_MESSAGES:
      return { ...state, messages: action.payload };
      
    case ActionTypes.ADD_MESSAGE:
      return {
        ...state,
        messages: [...state.messages, action.payload],
      };
      
    case ActionTypes.SET_CONTACTS:
      return { ...state, contacts: action.payload };
      
    case ActionTypes.SET_HOTEL_ID:
      return { ...state, hotelId: action.payload };
      
    case ActionTypes.SET_ACTIVE_BOOKING:
      return { ...state, activeBookingId: action.payload };
      
    case ActionTypes.SET_LOADING:
      return { ...state, dashLoading: action.payload };
      
    case ActionTypes.UPDATE_KPI_SPARKLINE:
      return {
        ...state,
        kpiData: state.kpiData.map((kpi, idx) =>
          idx === action.payload.index
            ? { ...kpi, sparkline: action.payload.data }
            : kpi
        ),
      };
      
    default:
      return state;
  }
}

// Context
const ReceptionContext = createContext(null);

// Provider Component
export function ReceptionProvider({ children, initialHotelId = null }) {
  const [state, dispatch] = useReducer(receptionReducer, {
    ...initialState,
    hotelId: initialHotelId,
  });
  
  // Action creators
  const actions = {
    setDarkMode: useCallback((isDark) => {
      dispatch({ type: ActionTypes.SET_DARK_MODE, payload: isDark });
    }, []),
    
    toggleModal: useCallback((modalName) => {
      dispatch({ type: ActionTypes.TOGGLE_MODAL, payload: modalName });
    }, []),
    
    closeAllModals: useCallback(() => {
      dispatch({ type: ActionTypes.CLOSE_ALL_MODALS });
    }, []),
    
    setNotificationsPanel: useCallback((show) => {
      dispatch({ type: ActionTypes.SET_NOTIFICATIONS_PANEL, payload: show });
    }, []),
    
    setNotifTab: useCallback((tab) => {
      dispatch({ type: ActionTypes.SET_NOTIF_TAB, payload: tab });
    }, []),
    
    setCmdPalette: useCallback((show) => {
      dispatch({ type: ActionTypes.SET_CMD_PALETTE, payload: show });
    }, []),
    
    setMessagingPanel: useCallback((show) => {
      dispatch({ type: ActionTypes.SET_MESSAGING_PANEL, payload: show });
    }, []),
    
    setMsgRecipient: useCallback((recipient) => {
      dispatch({ type: ActionTypes.SET_MSG_RECIPIENT, payload: recipient });
    }, []),
    
    setMsgText: useCallback((text) => {
      dispatch({ type: ActionTypes.SET_MSG_TEXT, payload: text });
    }, []),
    
    setRoomFilter: useCallback((filter) => {
      dispatch({ type: ActionTypes.SET_ROOM_FILTER, payload: filter });
    }, []),
    
    setCallingChannel: useCallback((channel) => {
      dispatch({ type: ActionTypes.SET_CALLING_CHANNEL, payload: channel });
    }, []),
    
    setDashboardData: useCallback((data) => {
      dispatch({ type: ActionTypes.SET_DASHBOARD_DATA, payload: data });
    }, []),
    
    setKpiData: useCallback((data) => {
      dispatch({ type: ActionTypes.SET_KPI_DATA, payload: data });
    }, []),
    
    setNotifications: useCallback((notifications) => {
      dispatch({ type: ActionTypes.SET_NOTIFICATIONS, payload: notifications });
    }, []),
    
    addNotification: useCallback((notification) => {
      dispatch({ type: ActionTypes.ADD_NOTIFICATION, payload: notification });
    }, []),
    
    markNotificationsRead: useCallback(() => {
      dispatch({ type: ActionTypes.MARK_NOTIFICATIONS_READ });
    }, []),
    
    setMessages: useCallback((messages) => {
      dispatch({ type: ActionTypes.SET_MESSAGES, payload: messages });
    }, []),
    
    addMessage: useCallback((message) => {
      dispatch({ type: ActionTypes.ADD_MESSAGE, payload: message });
    }, []),
    
    setLoading: useCallback((loading) => {
      dispatch({ type: ActionTypes.SET_LOADING, payload: loading });
    }, []),
    
    setHotelId: useCallback((id) => {
      dispatch({ type: ActionTypes.SET_HOTEL_ID, payload: id });
    }, []),
    
    setActiveBooking: useCallback((id) => {
      dispatch({ type: ActionTypes.SET_ACTIVE_BOOKING, payload: id });
    }, []),
  };
  
  const value = {
    state,
    dispatch,
    actions,
  };
  
  return (
    <ReceptionContext.Provider value={value}>
      {children}
    </ReceptionContext.Provider>
  );
}

// Custom Hook
export function useReception() {
  const context = useContext(ReceptionContext);
  if (!context) {
    throw new Error('useReception must be used within ReceptionProvider');
  }
  return context;
}

export { ActionTypes };
export default ReceptionContext;
