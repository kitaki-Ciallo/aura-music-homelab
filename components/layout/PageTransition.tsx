
import React, { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useTransition, animated } from '@react-spring/web';

interface PageTransitionProps {
    children: ReactNode;
}

const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
    const location = useLocation();

    const transitions = useTransition(location, {
        from: { opacity: 0, transform: 'translate3d(20px,0,0)' },
        enter: { opacity: 1, transform: 'translate3d(0,0,0)' },
        leave: { opacity: 0, transform: 'translate3d(-20px,0,0)', position: 'absolute' },
        config: { tension: 220, friction: 20 },
    });

    return transitions((style, item) => (
        <animated.div style={{ ...style, width: '100%', height: '100%', position: 'absolute' }}>
            {/* 
               We need to render the children, but properly keyed to the location.
               Usually children here is <Outlet /> or similar.
               However, <Outlet /> manages its own routing. 
               
               A common pattern for animated routing is:
               <TransitionGroup>
                  <CSSTransition key={location.key} ...>
                     <Routes location={location}>...</Routes>
                  </CSSTransition>
               </TransitionGroup>

               With react-router v6 and Outlet, it's tricker.
               
               Alternative: Just wrap the content of individual pages?
               Or pass the element from useRoutes?
               
               For simplicity in this structure:
               We will use this component inside MainLayout to wrap the Outlet?
               But Outlet renders the matched child.
            */}
            {children}
        </animated.div>
    ));
};

// Simplified version for now: Just wrap page content
export const FadeInPage: React.FC<{ children: ReactNode }> = ({ children }) => {
    const props = useTransition(true, {
        from: { opacity: 0, transform: 'translate3d(0, 10px, 0)' },
        enter: { opacity: 1, transform: 'translate3d(0, 0, 0)' },
        config: { tension: 280, friction: 60 },
    });

    return (
        <>
            {props((style, item) => item && <animated.div style={{ ...style, width: '100%', height: '100%' }}>{children}</animated.div>)}
        </>
    );
}

export default PageTransition;
