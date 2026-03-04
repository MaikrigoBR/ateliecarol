import React from 'react';
import { Instagram, Gift, Star, Megaphone, Heart } from 'lucide-react';

export function PromoBanner({ promoConfig, companyConfig }) {
    // Determine active state, defaulting to true if we have instagram config for retro-compatibility
    const isActive = promoConfig !== undefined ? promoConfig.active : !!companyConfig?.instagram;
    
    if (!isActive) return null;

    // Use config or fallbacks
    const title = promoConfig?.title || 'Acompanhe nossa Mágica!';
    const userInsta = companyConfig?.instagram?.replace('@', '') || '';
    const defaultText = userInsta 
        ? `Siga @${userInsta} no Instagram e acompanhe nossas novidades!` 
        : 'Siga nossas redes sociais para mais novidades!';
    const text = promoConfig?.text || defaultText;
    
    const bgStyle = promoConfig?.bgStyle || 'instagram';
    const bgColor = promoConfig?.bgColor || '#E1306C';
    const textColor = promoConfig?.textColor || '#ffffff';
    const iconName = promoConfig?.icon || 'instagram';

    let backgroundObject = {};
    if (bgStyle === 'instagram') {
        backgroundObject = { background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)' };
    } else {
        backgroundObject = { backgroundColor: bgColor };
    }

    const renderIcon = () => {
        const size = 24; 
        switch (iconName) {
            case 'gift': return <Gift size={size} />;
            case 'star': return <Star size={size} />;
            case 'megaphone': return <Megaphone size={size} />;
            case 'heart': return <Heart size={size} />;
            case 'instagram':
            default:
                return <Instagram size={size} />;
        }
    };

    const handleClick = () => {
        let url = promoConfig?.link || '';
        
        // Fallback to instagram URL if not set
        if (!url && userInsta) {
            url = `https://instagram.com/${userInsta}`;
        }
        
        if (url) {
            // make sure it has http if they typed without
            if (!url.startsWith('http')) url = 'https://' + url;
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    };

    return (
        <div 
            onClick={handleClick}
            style={{ 
                marginTop: '30px', padding: '16px 20px', borderRadius: '12px', ...backgroundObject,
                color: textColor, display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', 
                boxShadow: '0 4px 15px rgba(0,0,0,0.1)', transition: 'transform 0.2s', width: '100%', boxSizing: 'border-box'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'none'}
        >
            <div style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: '10px', borderRadius: '50%', display: 'flex', flexShrink: 0 }}>
                {renderIcon()}
            </div>
            <div style={{ flex: 1 }}>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: textColor, lineHeight: '1.2' }}>{title}</h4>
                <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.9, marginTop: '4px', lineHeight: '1.4', color: textColor }}>
                    {text}
                </p>
            </div>
        </div>
    );
}
