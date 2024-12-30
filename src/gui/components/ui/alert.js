const React = require('react');

const Alert = ({ children, variant = 'default', role, ...props }) => {
    return (
        <div role={role} className={`alert alert-${variant}`} {...props}>
            {children}
        </div>
    );
};

const AlertTitle = ({ children, ...props }) => {
    return <h4 className="alert-title" {...props}>{children}</h4>;
};

const AlertDescription = ({ children, ...props }) => {
    return <div className="alert-description" {...props}>{children}</div>;
};

module.exports = {
    Alert,
    AlertTitle,
    AlertDescription
};
