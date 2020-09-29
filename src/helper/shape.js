export const getTextBaseData = (data, isShapeEditing = false) => {
    const { baseData, style } = data;
    const baseDataForText = {
        x: baseData.x + style.strokeWidth,
        y: baseData.y + style.strokeWidth,
        width: baseData.width - style.strokeWidth * 2,
        height: baseData.height - style.strokeWidth * 2
    };
    if (isShapeEditing) {
        return baseDataForText;
    }
    return baseDataForText;
};
