class FractionUtils {
    static format(numerator, denominator) {
        return `<div class="fraction">
            <span>${numerator}</span>
            <span class="fdn">${denominator}</span>
        </div>`;
    }
    
    static reduce(numerator, denominator) {
        const gcd = (a, b) => b ? gcd(b, a % b) : a;
        const divisor = gcd(Math.abs(numerator), Math.abs(denominator));
        return [Math.round(numerator/divisor), Math.round(denominator/divisor)];
    }

    static generateFraction(level) {
        const max = Math.min(10 + level, 20);
        const denominator = Math.floor(Math.random() * (max - 2)) + 2;
        const numerator = Math.floor(Math.random() * (denominator - 1)) + 1;
        return [numerator, denominator];
    }
}
